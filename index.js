`use strict`;
const fs = require(`fs`);
const sqlite3 = require(`sqlite3`);
const os = require(`os`);
const express = require(`express`);

const expressApp = express();

const docsLocation = `${os.homedir()}/.local/share/dasht/docsets`;

class NotFoundError extends Error {
    constructor(...params) {
        super(...params);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, NotFoundError);
        }

        this.name = `NotFoundError`;
    }
}

expressApp.get(`/installed`, (_req, res) => {
    try {
        fs.readdir(docsLocation, (err, files) => {
            if (err) throw new NotFoundError(err);
            const docs = new Set([]);
            files.map((f) => docs.add(f.split(`.docset`)[0].split(`.tgz`)[0]));
            res.send({
                docs: Array.from(docs),
            });
        });
    } catch (err) {
        if (err instanceof NotFoundError) {
            res.status(404).send(err);
        } else {
            res.status(500).send(err);
        }
    }
});
const searchIndexFTSExists = {};
const checkFTS = (db) => new Promise((resolve) => {
    db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='searchIndexFTS'`,
        [],
        (err, row) => {
            if (err) throw new TypeError(err);

            resolve(!!row);
        }
    );
});
const installFTS = (db) => new Promise((resolve) => {
    db.run(
        `CREATE VIRTUAL TABLE searchIndexFTS USING fts5(name)`,
        (err) => {
            if (err) throw new TypeError(err);

            db.run(
                `INSERT INTO searchIndexFTS (name) SELECT name FROM searchIndex`,
                (err) => {
                    if (err) throw new TypeError(err);

                    resolve();
                }
            );
        }
    );
});
expressApp.get(`/search`, async (req, res) => {
    try {
        if (!req.query.q) throw new TypeError(`"q" query is missing`);
        if (!req.query.doc) throw new TypeError(`"doc" query is missing`);

        const query = decodeURIComponent(req.query.q);
        const doc = decodeURIComponent(req.query.doc);

        const dbPath = `${docsLocation}/${doc}.docset/Contents/Resources/docSet.dsidx`;

        if (!fs.existsSync(dbPath)) {
            throw new NotFoundError(`${doc} docset is either invalid or not installed`);
        }

        const db = new sqlite3.Database(dbPath);

        if (!searchIndexFTSExists[doc]) {
            if (!(await checkFTS(db))) {
                await installFTS(db);
            }
            searchIndexFTSExists[doc] = true;
        }
        db.all(
            `SELECT name, path FROM searchIndex WHERE name IN (SELECT * FROM searchIndexFTS WHERE name MATCH ? ORDER BY rank)`,
            [query],
            (err, rows) => {
                try {
                    if (err) throw new TypeError(err);

                    res.send(rows.map((row) => {
                        row.path = row.path.split(`>`).pop();
                        return row;
                    }));
                } catch (err) {
                    if (err instanceof TypeError) {
                        res.status(400).send(err.message);
                    } else {
                        throw err;
                    }
                }
            }
        );
        db.close();
    } catch (err) {
        if (err instanceof URIError) {
            res.sendStatus(400);
        } else if (err instanceof TypeError) {
            res.status(400).send(err.message);
        } else if (err instanceof NotFoundError) {
            res.status(404).send(err.message);
        } else {
            res.sendStatus(500);
            throw err;
        }
    }
});

expressApp.use(`/`, express.static(__dirname));
expressApp.use(`/d`, express.static(docsLocation));

expressApp.listen(8192, () => console.log(`http://localhost:3000/`));
