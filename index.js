"use strict";

var http = require("http");
var levelup = require("levelup");
var db = levelup("./mydb");
var keyRange = require("./key-range");
var Q = require("q");
var qGet = Q.denodeify(db.get.bind(db));

function getNonExistingKeys(prefix, cb) {
    var keys = keyRange(prefix);
    var existingKeys = [];
    Q.allSettled(keys.map(function (key) {
        return qGet(key);
    })).then(function (data)  {
        for (var i = 0; i < keys.length; i++) {
            if (data[i].state !== "fulfilled") existingKeys.push(keys[i]);
        }
        cb(existingKeys);
    });
}

function increasePrefix(prefix) {
    if (!prefix) {
        return "0";
    } else {
        return (parseInt(prefix, 36) + 1).toString(36);
    }
}

db.get("!!prefix", function (err, prefix) {
    if (err && err.name == "NotFoundError") {
        prefix = "";
    } else if (err) {
        throw err;
    }

    getNonExistingKeys(prefix, function (keys) {
        startUp(prefix, keys);
    });
});

function renderUrl(key) {
    return "http://" + (process.argv[3] ||  "localhost") + "/" + key.replace("!", "");
}

function internalServerError(res) {
    res.statusCode = 500;
    res.end("Internal Server Error");
}

function notFound(res) {
    res.statusCode = 404;
    res.end("Not Found");
}

function redirectTo(res, url) {
    res.writeHead(301, {
        'Location': url
    });
    res.end();
}

function addNewKeys(prefix) {
    if (!prefix) {
        prefix = "0";
    } else {
        prefix = (parseInt(prefix, 36) + 1).toString(36);
    }

    return {
        prefix: prefix,
        keys: keyRange(prefix)
    };
}

function server(prefix, keys) {
    return http.createServer(function (req, res) {
        if (req.method == "POST") {
            var body = "";
            req.on("data", function (data) {
                body += data.toString();
            }).on("end", function () {
                db.get(body, function (err, data) {
                    if (err && err.name == 'NotFoundError') {
                        var batch = db.batch();

                        if (keys.length == 0) {
                            var newKeys = addNewKeys(prefix);
                            keys = newKeys.keys;
                            prefix = newKeys.prefix;
                            batch.put("!!prefix", prefix);
                        }

                        var key = keys.pop();
                        batch.put(key, body)
                            .put(body, key)
                            .write(function (err) {
                            if (err) {
                                console.error(err);
                            }
                            res.end(renderUrl(key));
                        });

                        return;
                    }

                    if (err) {
                        console.error(err);
                        return internalServerError(res);
                    }

                    if (data) {
                        return res.end(renderUrl(data));
                    }

                });
            });
            return;
        }

        if (req.url == "/") {
            res.writeHead("Content-type", "text/html");
            return fs.createReadStream("./index.html").pipe(res);
        }

        var key = req.url.split("/")[1];
        db.get("!" + key, function (err, data) {
            if (err) {
                if (err.name == "NotFoundError") {
                    return notFound(res);
                }

                console.error(err);
                return internalServerError(res);
            }

            redirectTo(res, data);
        });
    });
}

function startUp(prefix, keys) {
    keys.sort(function () {
        return Math.random() - 0.5;
    });
    server(prefix, keys).listen(process.argv[2] || 3000);
}
