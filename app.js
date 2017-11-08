const http = require('http');
const express = require('express');
const app = express(); 
const server = http.createServer(app);
const MongoClient = require('mongodb').MongoClient;
const rp = require('request-promise');
const Promise = require('bluebird');

/* Apixu API config variables */
const apiUrl = "http://api.apixu.com/v1/";
const apiKey = "409167ff741942d9a59201326170304";
const city = "Buenos Aires";
const lang = "es";

/* database url */
const dbUrl = "mongodb://localhost:27017/weather";
var db;

/* connect to database and start server */
MongoClient.connect(dbUrl, function(err, database) {
    if (err) throw err;
    console.log("Database created!");
    db = database;
    server.listen(5000);
});

/* Endpoint for getting current weather in Buenos Aires */
app.get('/current-weather', (req,res) => {
    rp({
        url: apiUrl+"current.json",
        qs: {
          key: apiKey,
          q: city,
          lang: lang
        }
      }).then(function(body){
        console.log("Current weather request success!");
        var data = JSON.parse(body);
        res.json({
            condition_text: data.current.condition.text,
            condition_icon: data.current.condition.icon,
            temp_c: data.current.temp_c,
            humidity: data.current.humidity
          });
        }).catch(function (err) {
            console.log("Current weather request failed!");
            res.end('error: '+err);
    });
}); 

/* Endpoint for getting last 24 hours temperature range in Buenos Aires */
app.get('/yesterday-temperature-range', (req,res) => {
    
    let {todayDate, yesterdayDate, times} = getTimes();
    
    let requests = [{
        url: apiUrl+"history.json",
        qs: {
          key: apiKey,
          q: city,
          lang: lang,
          dt: yesterdayDate
        }
    },{
        url: apiUrl+"history.json",
        qs: {
          key: apiKey,
          q: city,
          lang: lang,
          dt: todayDate
        }
    }];
    
    /* make two requests, yesterday and today data, to get last 24 hours exact temperatures */
    /* TODO: Check for db data before making the requests */
    Promise.map(requests, function(obj) {
      return rp(obj).then(function(body) {
        return JSON.parse(body);
      });
    }).then(function(data) {
        console.log("Yesterday temperature range request success!");
        let temperatures = getTemperatures(data, times);
        let temps = Object.values(temperatures);
        
        /* save temperatures in db */
        for (var key in temperatures) {
            db.collection("temperatures").update(
               {  "time_epoch": key },
               {
                  "time_epoch": key,
                  "temp_c" : temperatures[key]
               },
               { upsert: true }
            );
        }

        let min = Math.min( ...temps ),
        max = Math.max( ...temps );
        res.json({
            "temp_min":min,
            "temp_max":max
        });
    }, function(err) {
        console.log("Yesterday temperature range request failed!");
        res.end('error: '+err);
    });
}); 

/* function for getting last 24hs times, in timestamps */
const getTimes = function getTimes() {
    let today = new Date(); 
    let todayTime = today.getHours();
    let todayDate = today.getFullYear() + "/" + (today.getMonth()+1)  + "/" + today.getDate();
    let yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    let yesterdayDate = yesterday.getFullYear() + "/" + (yesterday.getMonth()+1)  + "/" + yesterday.getDate();
    let yesterdayTimes = {}
    for (var i = todayTime; i <= 23; i++) {
        yesterday.setHours(i,0,0,0);
        yesterdayTimes[i] = yesterday.getTime()/1000;
    }
    let todayTimes = {};
    for (var i = 0; i <= (23-Object.keys(yesterdayTimes).length); i++) {
        today.setHours(i,0,0,0);
        todayTimes[i] = today.getTime()/1000;
    }
    
    let times = Object.assign(yesterdayTimes, todayTimes);
    
    return {todayDate, yesterdayDate, times};
}

/* function setting temperatures/timestamp object */
const getTemperatures = function getTemperatures(data,times) {
    let temperatures = {};
    for (var i = 0; i < data.length; i++) {
        var forecast = data[i].forecast.forecastday[0].hour;
        forecast.forEach(function(elem){
            for (var key in times) {
                var timestamp = times[key];
                if(elem.time_epoch == timestamp){
                    temperatures[timestamp] = elem.temp_c;
                }
            }
        });
      }
    return temperatures;
}

