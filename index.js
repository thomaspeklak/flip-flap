"use strict";

var http = require("http");
var levelup = require("levelup");
var db = levelup("./mydb");
var fs = require("fs");
var keyRange = require("./key-range");

var prefix;

function prefixOf(key) {
    return key.substring(0, key.length - 2);
}

function getExistingKeys(prefix, cb) {
    var keys = [];
    db.createKeyStream({
        start: prefix + "00",
        end: prefix + "zz"
    }).on("data", function (key) {
        keys.push(key);
    }).on("end", function () {
        cb(keys);
    }).on("error", function (err) {
        throw err;
    });
}

db.createKeyStream({
    start: "zzzzzzzzzzzzzzzzzzzzz",
    end: "zz",
    limit: 1
})
    .on("data", function (key) {
        startUp(prefixOf(key));
    })
    .on("end", function () {
        if (!prefix) {
            startUp("");
        }
    })
    .on("error", function (err) {
        throw err;
    });

function renderUrl(key) {
    return "http://" + (process.argv[3] ||  "localhost") + "/" + key;
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

function server(existingKeys) {
    return http.createServer(function (req, res) {
        if (req.method == "POST") {
            var body = "";
            req.on("data", function (data) {
                body += data.toString();
            }).on("end", function () {
                db.get(body, function (err, data) {
                    if (err && err.name == 'NotFoundError') {
                        var key = existingKeys.pop();
                        db.batch([{
                            type: "put",
                            key: key,
                            value: body
                        }, {
                            type: "put",
                            key: body,
                            value: key
                        }], function (err) {
                            if (err) {
                                console.dir(err);
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
        db.get(key, function (err, data) {
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

function startUp(prefix) {
    getExistingKeys(prefix, function (keys) {
        var existingKeys = keyRange(prefix, keys);
        existingKeys.sort(function () {
            return Math.random() - 0.5;
        });
        server(existingKeys).listen(process.argv[2] || 3000);
    });
}
