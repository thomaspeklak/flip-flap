"use strict";

module.exports = function (prefix) {
    if (typeof prefix == "undefined") prefix = "";
    var i = 0;
    var keys = [];
    while (i < 1296) {
        keys.push("!" + prefix + i.toString(36));
        i += 1;
    }

    console.log("generating new key population with prefix: " + prefix);

    return keys;
};
