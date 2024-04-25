"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
//const ais = new PrismaClient()
const { default: axios } = require("axios");
const db = require("../config/mysql");
const { RateLimiterMemory, RateLimiterMySQL } = require("rate-limiter-flexible");
const opts = {
    storeClient: db,
    dbName: 'ums',
    tableName: 'rate',
    duration: 3,
    points: 1 // Requests
};
// const rateLimiter = new RateLimiterMemory({
//     duration: 3,   // Per Second
//     points:   1    // Requests
// });
const rateLimiter = new RateLimiterMySQL(opts, (err) => console.log(err));
const voteLimiter = (req, res, next) => {
    rateLimiter
        .consume(req.userId)
        .then((rateLimiterRes) => {
        res.setHeader('Retry-After', rateLimiterRes.msBeforeNext / 1000);
        res.setHeader('X-RateLimit-Limit', 1);
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    })
        .catch(() => __awaiter(void 0, void 0, void 0, function* () {
        // Log to Rate Attacks
        axios.get(`https://geolocation-db.com/json/`).then(({ data }) => __awaiter(void 0, void 0, void 0, function* () {
            // await ais.attack.create({ data: {
            //    tag: req?.userId,
            //    ip: data?.IPv4,
            //    location: `Country: ${data?.country_name}, Coordinates: [ Lat ${data?.latitude}, Long ${data?.longitude} ] ${data?.city && data?.city != 'null' && ', City: '+data?.city}`,
            //    meta: "RATE ATTACK"
            // }})
        }));
        res.status(429).json({ message: 'Too Many Requests !' });
    }));
};
module.exports = {
    voteLimiter
};
// EH/BSS/19/0234 - adongo
// EH/ACT/20/0075 - abanga
