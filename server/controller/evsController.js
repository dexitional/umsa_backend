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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { PrismaClient } from "@prisma/client";
const ums_1 = require("../prisma/client/ums");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const moment_1 = __importDefault(require("moment"));
const evs = new ums_1.PrismaClient();
class EvsController {
    // Elections
    fetchElections(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.election.findMany({ where: { status: true }, orderBy: { createdAt: 'desc' } });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchMyElections(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                //const { tag } = req.params;
                const tag = '24010001';
                const en = yield evs.election.findMany({
                    where: { voterData: { path: '$[*].tag', array_contains: tag } },
                });
                if (en === null || en === void 0 ? void 0 : en.length) {
                    const resp = yield Promise.all(en === null || en === void 0 ? void 0 : en.map((r) => __awaiter(this, void 0, void 0, function* () {
                        const ts = yield evs.elector.findMany({ where: { electionId: r.id } });
                        const rs = yield evs.elector.findFirst({ where: { electionId: r.id, tag } });
                        return Object.assign(Object.assign({}, r), { turnout: ts.length, voters: ts, voteStatus: !!rs });
                    })));
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchElection(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.election.findUnique({
                    where: { id: Number(req.params.id) },
                });
                if (resp) {
                    const ts = yield evs.elector.count({ where: { electionId: Number(req.params.id) } });
                    const tm = yield Promise.all((_a = resp === null || resp === void 0 ? void 0 : resp.voterData) === null || _a === void 0 ? void 0 : _a.map((r) => __awaiter(this, void 0, void 0, function* () {
                        const ts = yield evs.elector.findFirst({ where: { electionId: Number(req.params.id), tag: r === null || r === void 0 ? void 0 : r.tag } });
                        return Object.assign(Object.assign({}, r), { voteStatus: !!ts });
                    })));
                    res.status(200).json(Object.assign(Object.assign({}, resp), { voterData: tm, turnout: ts }));
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postElection(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.election.create({ data: req.body });
                if (resp) {
                    // Create Upload Folder
                    fs_1.default.mkdirSync(path_1.default.join(__dirname, "/../../public/cdn/evs") + `/${resp.id}`);
                    // Return Response Data
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateElection(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.election.update({
                    where: { id: Number(req.params.id) },
                    data: req.body
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteElection(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.election.delete({
                    where: { id: Number(req.params.id) }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    // Voters & Votes
    postVotes(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield evs.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    let { id, tag, votes, ip, location } = req.body;
                    //tag = '24010001';
                    tag = 'MKL/MLTT/20/013';
                    if (!tag)
                        throw new Error(`Request user not found`);
                    if (!id)
                        throw new Error(`Request ID not found`);
                    const en = yield tx.election.findFirst({
                        where: { id, status: true, voterData: { path: '$[*].tag', array_contains: tag } },
                    });
                    if (en) {
                        // Check Vote Status
                        const ev = yield tx.elector.findFirst({ where: { electionId: id, tag } });
                        if (ev)
                            throw new Error(`Elector already voted`);
                        // Check IF Election is still Opened for Grace Period
                        if (en.status && (en.action == 'STARTED' || (en.action == 'ENDED' && (0, moment_1.default)().diff((0, moment_1.default)(en.endAt), 'seconds') <= 120))) {
                            // Record Vote (IF not Voted)
                            //const sels = votes.split(",");
                            if (votes.length) {
                                const resp = yield Promise.all(votes === null || votes === void 0 ? void 0 : votes.map((cid) => __awaiter(this, void 0, void 0, function* () {
                                    return yield tx.candidate.updateMany({
                                        where: { id: cid },
                                        data: { votes: { increment: 1 } }
                                    });
                                })));
                                // Check Number of Recorded Votes
                                if (resp.length != votes.length)
                                    throw new Error(`Vote Submission Disallowed`);
                                // Record Voter
                                const vs = (_a = en === null || en === void 0 ? void 0 : en.voterData) === null || _a === void 0 ? void 0 : _a.find((r) => r.tag == tag);
                                yield tx.elector.create({
                                    data: {
                                        voteStatus: true,
                                        voteSum: Object.values(votes).join(","),
                                        voteTime: new Date(),
                                        voteIp: ip,
                                        name: vs === null || vs === void 0 ? void 0 : vs.name,
                                        tag,
                                        election: { connect: { id } }
                                    }
                                });
                                // Return Success Status
                                res.status(200).json(resp);
                            }
                            else
                                throw new Error(`Votes invalid`);
                        }
                        else
                            throw new Error(`Election is closed`);
                    }
                    else
                        throw new Error(`Elector not listed`);
                }));
            }
            catch (error) {
                return res.status(203).json({ message: error.message });
            }
        });
    }
    fetchVotes(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                let portfolios = yield evs.portfolio.findMany({ where: { electionId: Number(id) } });
                const election = yield evs.election.findUnique({ where: { id: Number(id) } });
                const electors = yield evs.elector.findMany({ where: { electionId: Number(id) } });
                if (election && portfolios) {
                    portfolios = yield Promise.all(portfolios === null || portfolios === void 0 ? void 0 : portfolios.map((r) => __awaiter(this, void 0, void 0, function* () {
                        const candidates = yield evs.candidate.findMany({ where: { status: true, portfolioId: r.id }, include: { portfolio: { select: { electionId: true } } }, orderBy: [{ votes: 'desc' }, { orderNo: 'asc' }] });
                        return Object.assign(Object.assign({}, r), { candidates });
                    })));
                    res.status(200).json({ election, portfolios, electors });
                }
                else {
                    res.status(204).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchVoters(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.election.findUnique({
                    where: { id: Number(req.params.id) },
                    select: { voterData: true }
                });
                if (resp) {
                    // Check Mask on vote Status
                    res.status(200).json(resp === null || resp === void 0 ? void 0 : resp.voterData);
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchVoter(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { tag } = req.params;
                const resp = yield evs.election.findUnique({
                    where: { id: Number(req.params.id) },
                });
                if (resp) {
                    const voterData = resp === null || resp === void 0 ? void 0 : resp.voterData;
                    const voter = voterData === null || voterData === void 0 ? void 0 : voterData.find((r) => r.tag == tag);
                    // Check Vote Status
                    const vs = yield evs.elector.findFirst({ where: { electionId: Number(req.params.id), tag } });
                    // Return Response
                    res.status(200).json(Object.assign(Object.assign({}, resp), { voter, voteStatus: !!vs }));
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postVoter(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { tag, name } = req.body;
                const resp = yield evs.election.update({
                    where: { id: Number(req.params.id) },
                    data: {
                        voterData: {
                            // jsonb_build_object: { tag, name } 
                            jsonb_set: {
                                path: '$',
                                value: { tag, name },
                                append: true
                            }
                        }
                    }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteVoter(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { tag } = req.params;
                const resp = yield evs.election.update({
                    where: {
                        id: Number(req.params.id),
                        voterData: { path: '$.tag', array_contains: tag }
                    },
                    data: {
                        voterData: { jsonb_remove: { path: '$[*]' } }
                    }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    // Receipt or Transcript
    fetchReceipt(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { tag, id } = req.params;
                const resp = yield evs.elector.findFirst({
                    where: { tag, electionId: Number(req.params.id) },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    // Portfolios
    fetchPortfolios(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.portfolio.findMany({ where: { electionId: Number(req.params.id) } });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchPortfolio(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.portfolio.findUnique({
                    where: {
                        id: Number(req.params.id)
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postPortfolio(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.portfolio.create({ data: req.body });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updatePortfolio(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.portfolio.update({
                    where: { id: Number(req.params.id) },
                    data: req.body
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deletePortfolio(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.portfolio.delete({
                    where: { id: Number(req.params.id) }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    // Candidates
    fetchCandidates(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.candidate.findMany({ where: { portfolioId: Number(req.params.id) } });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchCandidate(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.candidate.findUnique({
                    where: {
                        id: Number(req.params.id)
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postCandidate(req, res) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const photo = (_a = req === null || req === void 0 ? void 0 : req.files) === null || _a === void 0 ? void 0 : _a.photo;
                const resp = yield evs.candidate.create({ data: req.body, include: { portfolio: true } });
                if (resp) {
                    // Upload Photo
                    const tag = resp === null || resp === void 0 ? void 0 : resp.id;
                    const eid = (_b = resp === null || resp === void 0 ? void 0 : resp.portfolio) === null || _b === void 0 ? void 0 : _b.electionId;
                    const dest = path_1.default.join(__dirname, "/../../public/cdn/photo/evs" + eid, ((_d = (_c = tag === null || tag === void 0 ? void 0 : tag.toString()) === null || _c === void 0 ? void 0 : _c.trim()) === null || _d === void 0 ? void 0 : _d.toLowerCase()) + ".jpg");
                    photo.mv(dest, function (err) {
                        if (err)
                            return res.status(500).send(err);
                    });
                    // Return Response
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateCandidate(req, res) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const photo = (_a = req === null || req === void 0 ? void 0 : req.files) === null || _a === void 0 ? void 0 : _a.photo;
                const resp = yield evs.candidate.update({
                    where: { id: Number(req.params.id) },
                    data: req.body,
                    include: { portfolio: true }
                });
                if (resp) {
                    // Upload Photo
                    const tag = resp === null || resp === void 0 ? void 0 : resp.id;
                    const eid = (_b = resp === null || resp === void 0 ? void 0 : resp.portfolio) === null || _b === void 0 ? void 0 : _b.electionId;
                    const dest = path_1.default.join(__dirname, "/../../public/cdn/photo/evs" + eid, ((_d = (_c = tag === null || tag === void 0 ? void 0 : tag.toString()) === null || _c === void 0 ? void 0 : _c.trim()) === null || _d === void 0 ? void 0 : _d.toLowerCase()) + ".jpg");
                    photo.mv(dest, function (err) {
                        if (err)
                            return res.status(500).send(err);
                    });
                    // Return Response
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteCandidate(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.candidate.delete({
                    where: { id: Number(req.params.id) }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postEvsData(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.session.findMany({ where: { status: true }, orderBy: { title: 'asc' } });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchEvsMonitor(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.session.findMany({ where: { status: true }, orderBy: { title: 'asc' } });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchEvsData(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield evs.session.findMany({ where: { status: true }, orderBy: { title: 'asc' } });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(204).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
}
exports.default = EvsController;
