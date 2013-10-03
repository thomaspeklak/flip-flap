"use strict";
var http = require("http");
var fs = require("fs");
var increasePrefix = require("./increase-prefix");
var keyRange = require("./key-range");
var ecstatic = require("ecstatic");

function trimTrailingSlash (text) {
    return text.replace(/\/$/, "");
}

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
module.exports = function server(prefix, keys, db) {
    function insert(url, cb) {
        var batch = db.batch();

        if (keys.length === 0) {
            var newKeys = addNewKeys(prefix);
            keys = newKeys.keys;
            prefix = newKeys.prefix;
            batch.put("!!prefix", prefix);
        }

        var key = keys.pop();
        batch.put(key, url)
        .put(url, key)
        .write(function (err) {
            cb(err, key);
        });
    }

    function handlePost(req, res) {
        var body = "";
        req.on("data", function (data) {
            body += data.toString();
        }).on("end", function () {
            body = trimTrailingSlash(body);
            db.get(body, function (err, data) {
                if (err && err.name === "NotFoundError") {
                    return insert(body, function (err, key) {
                        if (err) console.error(err);
                        res.statusCode = 200;
                        res.end(renderUrl(key));
                    });
                }

                if (err) {
                    console.error(err);
                    return internalServerError(res);
                }

                if (data) {
                    res.statusCode = 200;
                    return res.end(renderUrl(data));
                }

            });
        });

    }

    function handleGet(req, res) {
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
    }

    function handleRequest(req, res) {
        if (req.method == "POST") {
            return handlePost(req, res);
        }

        if (req.url == "/") {
            res.writeHead("Content-type", "text/html");
            return fs.createReadStream("./index.html").pipe(res);
        }

        handleGet(req, res);
    }

    var staticd = ecstatic({
        root: __dirname + "/public",
        handleError: false,
        cache: 3600,
        showDir: false,
        autoIndex: false,
        defaultExt: "html"
    });

    return http.createServer(function (req, res) {
        staticd(req, res, function () {
            handleRequest(req, res);
        })
    });
};
