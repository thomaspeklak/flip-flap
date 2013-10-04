"use strict";

var fs = require("fs");
var QRCode = require("qrcode");

module.exports = function generateQrCode(url, cb) {
    var encodedTarget = url.replace("/qr-codes/", "");
    var target = decodeURIComponent(encodedTarget).replace(/\.png$/, "");
    QRCode.draw(target, {errorCorrectLevel: "max"},  function (err, canvas) {
        if (err) return cb(err);

        var stream = canvas.pngStream();
        var writeStream = fs.createWriteStream(__dirname + "/public/qr-codes/" + encodedTarget);
        stream.pipe(writeStream);
        cb(null, stream);
    });
};
