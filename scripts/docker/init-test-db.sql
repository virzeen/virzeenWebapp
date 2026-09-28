-- Separate databases for integration tests and end-to-end runs (docs/testing/testing-strategy.md §5).
CREATE DATABASE virzeen_test OWNER virzeen;
CREATE DATABASE virzeen_e2e OWNER virzeen;
