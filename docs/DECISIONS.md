# Gate G1 Decision: Option C (Tier-0 Static Core)

- Selected: Option C (No backend in demo path; client-side TS core + snapshot + static trajectories).
- Evidence:
  - Build/Environment: Local host lacks JDK 21 and Maven; cloud build of 5 JVM services on free Render is unviable due to 512MB RAM limits and cold starts.
  - Merge Feasibility: Merging 5 Spring services into 1 requires resolving Spring Cloud Gateway (WebFlux/Netty) vs WebMvc conflicts, exceeding a single session.
  - Tests: Existing 475 pytest tests run on in-process simulation harness; Java backend has zero unit tests.
  - Reliability: Option C guarantees Tier-0 demo path works completely offline from static assets with zero server dependencies or cold-start risk.
- Next Step: S1b builds pure TS math core in `packages/core/` matching Python oracle golden vectors.
