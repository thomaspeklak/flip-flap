"use strict";

module.exports = function (prefix, existing) {
    if (typeof prefix == "undefined") prefix = "";
    var i = 0;
    var keys = [];
    while (i < 1296) {
        var key = prefix + i.toString(36);

        if (!(key in existing)) {
            keys.push(key);
        }
        i += 1;
    }

    return keys;
};
