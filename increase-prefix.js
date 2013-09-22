"use strict";

module.exports = function increasePrefix(prefix) {
    if (!prefix) {
        return "0";
    } else {
        return (parseInt(prefix, 36) + 1).toString(36);
    }
};
