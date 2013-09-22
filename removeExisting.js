"use strict";

module.exports = function (keys, existing) {
    if(!existing || existing.length === 0) return keys;

    return keys.filter(function (key) {
        return !(key in existing);
    });
};
