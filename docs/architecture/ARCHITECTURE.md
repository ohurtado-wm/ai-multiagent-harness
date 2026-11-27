# Architecture

Describe here the architecture of the project under development: the apps and how they talk to each other, where the business rules live, the data model and the contracts in `shared/schemas/`. Plans link to this document instead of repeating it (rule «do not duplicate documentation» in `AGENTS.md`).

Suggested sections:

- **Components:** apps, backend, shared packages, and what each one owns.
- **Contracts:** the messages or API payloads shared between apps, their versioning and compatibility rules (the `contract-reviewer` subagent checks them).
- **Data and security:** tenancy model, authorization on the server, personal data handling (the `db-security-reviewer` subagent checks them).
- **Lists and tables:** search, filters and sorting in the database, in batches with a `total`.
