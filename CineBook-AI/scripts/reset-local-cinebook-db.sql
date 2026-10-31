-- DESTRUCTIVE LOCAL-DEVELOPMENT RECOVERY ONLY
-- Run this in MySQL Workbench as a MySQL administrator ONLY if you can discard
-- all data in the local `cinebook` database. It drops every table and record.
-- Back up any data you need before executing these statements.
-- After running, restart CineBook; Flyway will execute V1__initial_schema.sql.

DROP DATABASE IF EXISTS cinebook;
CREATE DATABASE cinebook
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
