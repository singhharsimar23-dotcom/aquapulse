import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers?: React.ReactNode[];
  caption?: string;
  stickyHeader?: boolean;
  containerClassName?: string;
  children: React.ReactNode;
}

/**
 * Design System Table component (§8.3).
 * Structured data presentation with hairline borders, JetBrains Mono tabular figures,
 * and clear headers.
 */
export const Table: React.FC<TableProps> = ({
  headers,
  caption,
  stickyHeader = false,
  containerClassName = '',
  className = '',
  children,
  ...rest
}) => {
  return (
    <div className={`ds-table-container ${stickyHeader ? 'table-sticky' : ''} ${containerClassName}`.trim()}>
      <table className={`ds-table ${className}`.trim()} {...rest}>
        {caption && <caption className="ds-table-caption">{caption}</caption>}
        {headers && headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>{children}</tbody>
      </table>
    </div>
  );
};
