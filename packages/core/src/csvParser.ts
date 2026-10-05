/**
 * §8.11 Bring-your-own CSV Parser and Validator
 * Browser-parsed, zero dependencies, empty cell = null (never 0).
 */
import { Acres, Hours, M3PerHour, asAcres, asHours } from './types.js';
import { sha256Sync, toHex } from './merkle.js';

export interface CsvFarmerRow {
  farmerId: string;
  week: string;
  landAcres: Acres;
  wellDischargeM3h: M3PerHour;
  reportedHours: Hours | null;
  meterHours: Hours | null;
  crop?: string;
  satelliteVolumeM3?: number | null;
}

export interface CsvParseResult {
  rows: CsvFarmerRow[];
  warnings: string[];
  sha256: string;
}

const ISO_WEEK_REGEX = /^\d{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$/;

const KNOWN_COLUMNS = new Set([
  'farmer_id',
  'week',
  'land_acres',
  'well_discharge_m3h',
  'reported_hours',
  'meter_hours',
  'meter_kwh',
  'rated_kw',
  'crop',
  'satellite_volume_m3',
]);

/**
 * Parses and validates CSV string.
 * Empty cells are strictly parsed as null, NEVER 0.
 */
export function parseAndValidateCsv(csvText: string): CsvParseResult {
  const hash = toHex(sha256Sync(new TextEncoder().encode(csvText)));
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row');
  }

  const rawHeader = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const headerMap: Record<string, number> = {};
  const warnings: string[] = [];

  rawHeader.forEach((col, idx) => {
    headerMap[col] = idx;
    if (!KNOWN_COLUMNS.has(col)) {
      warnings.push(`Unknown column '${col}' ignored`);
    }
  });

  const requiredBase = ['farmer_id', 'week', 'land_acres', 'well_discharge_m3h'];
  for (const col of requiredBase) {
    if (headerMap[col] === undefined) {
      throw new Error(`Missing required column: '${col}'`);
    }
  }

  const hasMeterHours = headerMap['meter_hours'] !== undefined;
  const hasMeterKwh = headerMap['meter_kwh'] !== undefined && headerMap['rated_kw'] !== undefined;

  if (!hasMeterHours && !hasMeterKwh) {
    throw new Error(
      "CSV requires either 'meter_hours' column or both 'meter_kwh' and 'rated_kw' columns"
    );
  }

  const rows: CsvFarmerRow[] = [];
  const farmerSet = new Set<string>();
  const weekSet = new Set<string>();
  const farmerWeekSet = new Set<string>();

  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const rowNum = lineIdx + 1; // 1-indexed row number in file
    const cells = lines[lineIdx].split(',').map((c) => c.trim());

    const getCell = (colName: string): string => {
      const idx = headerMap[colName];
      return idx !== undefined && idx < cells.length ? cells[idx] : '';
    };

    const parseNum = (colName: string, allowEmpty: boolean): number | null => {
      const val = getCell(colName);
      if (val === '') {
        return null; // Empty cell is strictly null
      }
      const num = Number(val);
      if (isNaN(num)) {
        throw new Error(`Row ${rowNum}, column '${colName}': '${val}' is not a valid number`);
      }
      return num;
    };

    const farmerId = getCell('farmer_id');
    if (!farmerId) {
      throw new Error(`Row ${rowNum}, column 'farmer_id': farmer_id cannot be empty`);
    }

    const week = getCell('week');
    if (!ISO_WEEK_REGEX.test(week)) {
      throw new Error(
        `Row ${rowNum}, column 'week': '${week}' does not match ISO week format (e.g. 2026-W10)`
      );
    }

    const fwKey = `${farmerId}:${week}`;
    if (farmerWeekSet.has(fwKey)) {
      throw new Error(
        `Row ${rowNum}: duplicate record for farmer '${farmerId}' in week '${week}'`
      );
    }
    farmerWeekSet.add(fwKey);
    farmerSet.add(farmerId);
    weekSet.add(week);

    const landAcres = parseNum('land_acres', false);
    if (landAcres === null || landAcres <= 0) {
      throw new Error(`Row ${rowNum}, column 'land_acres': must be > 0`);
    }

    const wellDischarge = parseNum('well_discharge_m3h', false);
    if (wellDischarge === null || wellDischarge <= 0) {
      throw new Error(`Row ${rowNum}, column 'well_discharge_m3h': must be > 0`);
    }

    const reportedHoursRaw = parseNum('reported_hours', true);
    if (reportedHoursRaw !== null && reportedHoursRaw < 0) {
      throw new Error(`Row ${rowNum}, column 'reported_hours': negative hours rejected`);
    }

    let meterHoursRaw = hasMeterHours ? parseNum('meter_hours', true) : null;
    if (meterHoursRaw === null && hasMeterKwh) {
      const kwh = parseNum('meter_kwh', true);
      const kw = parseNum('rated_kw', true);
      if (kwh !== null && kw !== null && kw > 0) {
        meterHoursRaw = kwh / kw;
      }
    }
    if (meterHoursRaw !== null && meterHoursRaw < 0) {
      throw new Error(`Row ${rowNum}, column 'meter_hours': negative hours rejected`);
    }

    const crop = getCell('crop') || undefined;
    const satVol = headerMap['satellite_volume_m3'] !== undefined ? parseNum('satellite_volume_m3', true) : null;

    rows.push({
      farmerId,
      week,
      landAcres: asAcres(landAcres),
      wellDischargeM3h: wellDischarge as M3PerHour,
      reportedHours: reportedHoursRaw === null ? null : asHours(reportedHoursRaw),
      meterHours: meterHoursRaw === null ? null : asHours(meterHoursRaw),
      crop,
      satelliteVolumeM3: satVol,
    });
  }

  if (farmerSet.size > 40) {
    throw new Error(`CSV exceeds maximum limit of 40 farmers (found ${farmerSet.size})`);
  }
  if (weekSet.size > 52) {
    throw new Error(`CSV exceeds maximum limit of 52 weeks (found ${weekSet.size})`);
  }

  return {
    rows,
    warnings,
    sha256: hash,
  };
}
