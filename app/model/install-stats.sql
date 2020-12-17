PRAGMA foreign_keys = off;

DROP TABLE IF EXISTS request;
CREATE TABLE request (
    ident TEXT NOT NULL,
    resource TEXT NOT NULL,
    timestamp_utc INTEGER NOT NULL
);
