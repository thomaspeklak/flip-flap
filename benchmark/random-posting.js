"use strict";

var request = require("request");

var concurrent = 0;
var maxConcurrent = 10000;
var counter = 0;

function makeRequest() {
    if (concurrent >= maxConcurrent) return;
    concurrent++;

    counter++;

    request.post("http://localhost:3000", {
            body: encodeURIComponent("http:/test.com/" + Math.random())
        },

        function (err, res, body) {
            concurrent--;
            makeRequest();
        }
    );
    makeRequest();
}

makeRequest();

setInterval(function () {
    console.log("Requests/s: " + counter);
    counter = 0;
}, 1000);
