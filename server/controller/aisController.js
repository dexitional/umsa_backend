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
const evsModel_1 = __importDefault(require("../model/evsModel"));
const authModel_1 = __importDefault(require("../model/authModel"));
const ums_1 = require("../prisma/client/ums");
const moment_1 = __importDefault(require("moment"));
//import sha1 from "sha1";
const helper_1 = require("../util/helper");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ais = new ums_1.PrismaClient();
const evs = new evsModel_1.default();
const Auth = new authModel_1.default();
const sha1 = require('sha1');
const { customAlphabet } = require("nanoid");
const pwdgen = customAlphabet("1234567890abcdefghijklmnopqrstuvwzyx", 6);
class AisController {
    fetchTest(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tag = '24010001';
                const resp = yield ais.election.findMany({
                    // where: { voterList: { array_contains: tag }},
                    where: { voterData: { path: '$[*].tag', array_contains: tag } },
                });
                console.log(resp);
                if (resp === null || resp === void 0 ? void 0 : resp.length) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Session */
    fetchSessionList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.session.findMany({ where: { status: true }, orderBy: { title: 'asc' } });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchSessions(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 9, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = { orderBy: { createdAt: 'desc' } };
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            OR: [
                                { title: { contains: keyword } },
                                { id: { contains: keyword } },
                            ],
                        },
                        orderBy: { createdAt: 'desc' }
                    };
                const resp = yield ais.$transaction([
                    ais.session.count(Object.assign({}, (searchCondition))),
                    ais.session.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize) }))
                ]);
                //if(resp && resp[1]?.length){
                res.status(200).json({
                    totalPages: (_a = Math.ceil(resp[0] / pageSize)) !== null && _a !== void 0 ? _a : 0,
                    totalData: (_b = resp[1]) === null || _b === void 0 ? void 0 : _b.length,
                    data: resp[1],
                });
                //} else {
                //res.status(202).json({ message: `no records found` })
                //}
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.session.findUnique({
                    where: {
                        id: req.params.id
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    activateSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { sessionId } = req.body;
                const resm = yield ais.session.findUnique({ where: { id: sessionId } });
                const resx = yield ais.session.updateMany({ where: { NOT: { id: sessionId }, tag: resm === null || resm === void 0 ? void 0 : resm.tag }, data: { default: false } });
                //const resx = await ais.session.updateMany({ where: { NOT: { id: sessionId }  }, data: { default: false } })
                const resp = yield ais.session.update({ where: { id: sessionId }, data: { default: true } });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.session.create({ data: Object.assign({}, req.body) });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.session.update({
                    where: {
                        id: req.params.id
                    },
                    data: Object.assign({}, req.body)
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteSession(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.session.delete({
                    where: { id: req.params.id }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Student */
    fetchStudents(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 6, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            OR: [
                                { fname: { contains: keyword } },
                                { lname: { contains: keyword } },
                                { id: { contains: keyword } },
                                { phone: { contains: keyword } },
                                { email: { contains: keyword } },
                                { indexno: { contains: keyword } },
                            ],
                        }
                    };
                const resp = yield ais.$transaction([
                    ais.student.count(Object.assign({}, (searchCondition))),
                    ais.student.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize), include: {
                            title: { select: { label: true } },
                            country: { select: { longName: true } },
                            region: { select: { title: true } },
                            religion: { select: { title: true } },
                            disability: { select: { title: true } },
                            program: {
                                select: {
                                    longName: true,
                                    department: { select: { title: true } }
                                }
                            },
                        } }))
                ]);
                //if(resp && resp[1]?.length){
                res.status(200).json({
                    totalPages: (_a = Math.ceil(resp[0] / pageSize)) !== null && _a !== void 0 ? _a : 0,
                    totalData: (_b = resp[1]) === null || _b === void 0 ? void 0 : _b.length,
                    data: resp[1],
                });
                //} else {
                //res.status(202).json({ message: `no records found` })
                //}
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchStudent(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.student.findUnique({
                    where: {
                        id: req.params.id
                    },
                    include: {
                        title: { select: { label: true } },
                        country: { select: { longName: true } },
                        region: { select: { title: true } },
                        religion: { select: { title: true } },
                        disability: { select: { title: true } },
                        program: {
                            select: {
                                longName: true,
                                department: { select: { title: true } }
                            }
                        },
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchStudentTranscript(req, res) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.assessment.findMany({
                    where: { indexno: req.params.id },
                    include: {
                        student: { select: { fname: true, mname: true, id: true, program: { select: { longName: true } } } },
                        scheme: { select: { gradeMeta: true, } },
                        session: { select: { title: true, } },
                        course: { select: { title: true } },
                    },
                    orderBy: [{ session: { createdAt: 'asc' } }, { courseId: 'asc' }]
                });
                if (resp) {
                    var mdata = new Map();
                    for (const sv of resp) {
                        const index = (_b = (_a = sv === null || sv === void 0 ? void 0 : sv.session) === null || _a === void 0 ? void 0 : _a.title) !== null && _b !== void 0 ? _b : 'none';
                        const grades = (_c = sv.scheme) === null || _c === void 0 ? void 0 : _c.gradeMeta;
                        const zd = Object.assign(Object.assign({}, sv), { grade: yield (0, helper_1.getGrade)(sv.totalScore, grades), gradepoint: yield (0, helper_1.getGradePoint)(sv.totalScore, grades) });
                        // Data By Courses
                        if (mdata.has(index)) {
                            mdata.set(index, [...mdata.get(index), Object.assign({}, zd)]);
                        }
                        else {
                            mdata.set(index, [Object.assign({}, zd)]);
                        }
                    }
                    res.status(200).json(Array.from(mdata));
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchStudentFinance(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.studentAccount.findMany({
                    where: { studentId: req.params.id },
                    include: {
                        student: { select: { fname: true, mname: true, indexno: true, program: { select: { longName: true } } } },
                        bill: { select: { narrative: true } },
                        charge: { select: { title: true } },
                        session: { select: { title: true } },
                        transaction: { select: { transtag: true } },
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchStudentActivity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.student.findUnique({
                    where: {
                        id: req.params.id
                    },
                    include: {
                        country: true,
                        program: {
                            select: {
                                longName: true
                            }
                        },
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    stageStudent(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { studentId } = req.body;
                const password = pwdgen();
                const isUser = yield ais.user.findFirst({ where: { tag: studentId } });
                if (isUser)
                    throw ("Student Portal Account Exists!");
                const ssoData = { tag: studentId, username: studentId, password: sha1(password), unlockPin: password }; // Others
                // Populate SSO Account
                const resp = yield ais.user.create({
                    data: Object.assign(Object.assign({}, ssoData), { group: { connect: { id: 1 } } }),
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json(error);
            }
        });
    }
    resetStudent(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { studentId } = req.body;
                console.log(studentId);
                const password = pwdgen();
                const resp = yield ais.user.updateMany({
                    where: { tag: studentId },
                    data: { password: sha1(password), unlockPin: password },
                });
                console.log(resp);
                if (resp === null || resp === void 0 ? void 0 : resp.count) {
                    res.status(200).json({ password });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json(error);
            }
        });
    }
    changePhoto(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { studentId } = req.body;
                const password = pwdgen();
                const resp = yield ais.user.updateMany({
                    where: { tag: studentId },
                    data: { password: sha1(password) },
                });
                if (resp) {
                    res.status(200).json({ password });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json(error);
            }
        });
    }
    generateIndex(req, res) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { studentId } = req.body;
                let indexno;
                const student = yield ais.student.findUnique({
                    where: { id: studentId },
                    include: { program: { select: { prefix: true } } },
                });
                if (student === null || student === void 0 ? void 0 : student.indexno)
                    throw ("Index number exists for student!");
                const count = ((_a = student === null || student === void 0 ? void 0 : student.progCount) === null || _a === void 0 ? void 0 : _a.toString().length) == 1 ? `00${student === null || student === void 0 ? void 0 : student.progCount}` : ((_b = student === null || student === void 0 ? void 0 : student.progCount) === null || _b === void 0 ? void 0 : _b.toString().length) == 2 ? `0${student === null || student === void 0 ? void 0 : student.progCount}` : student === null || student === void 0 ? void 0 : student.progCount;
                indexno = `${(_c = student === null || student === void 0 ? void 0 : student.program) === null || _c === void 0 ? void 0 : _c.prefix}/${(0, moment_1.default)((student === null || student === void 0 ? void 0 : student.entryDate) || new Date()).format("YY")}/${count}`;
                const resp = yield ais.student.update({
                    where: { id: studentId },
                    data: { indexno },
                });
                if (resp) {
                    res.status(200).json({ indexno });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json(error);
            }
        });
    }
    postStudent(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { titleId, programId, countryId, regionId, religionId, disabilityId } = req.body;
                delete req.body.titleId;
                delete req.body.programId;
                delete req.body.countryId;
                delete req.body.regionId;
                delete req.body.religionId;
                delete req.body.disabilityId;
                const resp = yield ais.student.create({
                    data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, req.body), programId && ({ program: { connect: { id: programId } } })), titleId && ({ title: { connect: { id: titleId } } })), countryId && ({ country: { connect: { id: countryId } } })), regionId && ({ region: { connect: { id: regionId } } })), religionId && ({ religion: { connect: { id: religionId } } })), disabilityId && ({ disability: { connect: { id: disabilityId } } }))
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateStudent(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { titleId, programId, countryId, regionId, religionId, disabilityId } = req.body;
                delete req.body.titleId;
                delete req.body.programId;
                delete req.body.countryId;
                delete req.body.regionId;
                delete req.body.religionId;
                delete req.body.disabilityId;
                const resp = yield ais.student.update({
                    where: { id: req.params.id },
                    data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, req.body), programId && ({ program: { connect: { id: programId } } })), titleId && ({ title: { connect: { id: titleId } } })), countryId && ({ country: { connect: { id: countryId } } })), regionId && ({ region: { connect: { id: regionId } } })), religionId && ({ religion: { connect: { id: religionId } } })), disabilityId && ({ disability: { connect: { id: disabilityId } } }))
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteStudent(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.student.delete({
                    where: { id: req.params.id }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Courses */
    fetchCourseList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.course.findMany({ where: { status: true }, orderBy: { title: 'asc' } });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchCourses(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 9, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            OR: [
                                { title: { contains: keyword } },
                                { id: { contains: keyword } },
                            ],
                        }
                    };
                const resp = yield ais.$transaction([
                    ais.course.count(Object.assign({}, (searchCondition))),
                    ais.course.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize) }))
                ]);
                //if(resp && resp[1]?.length){
                res.status(200).json({
                    totalPages: (_a = Math.ceil(resp[0] / pageSize)) !== null && _a !== void 0 ? _a : 0,
                    totalData: (_b = resp[1]) === null || _b === void 0 ? void 0 : _b.length,
                    data: resp[1],
                });
                //} else {
                //res.status(202).json({ message: `no records found` })
                //}
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchCourse(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.course.findUnique({
                    where: {
                        id: req.params.id
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postCourse(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.course.create({
                    data: Object.assign({}, req.body),
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateCourse(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.course.update({
                    where: {
                        id: req.params.id
                    },
                    data: Object.assign({}, req.body)
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteCourse(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.course.delete({
                    where: { id: req.params.id }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Structure & Curriculum */
    fetchCurriculums(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 9, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            OR: [
                                { courseId: { contains: keyword } },
                                { unit: { title: { contains: keyword } } },
                                { program: { longName: { contains: keyword } } },
                                { course: { title: { contains: keyword } } },
                            ],
                        }
                    };
                const resp = yield ais.$transaction([
                    ais.structure.count(Object.assign({}, (searchCondition))),
                    ais.structure.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize), include: {
                            unit: { select: { title: true } },
                            program: { select: { longName: true } },
                            course: { select: { title: true } },
                        } }))
                ]);
                //if(resp && resp[1]?.length){
                res.status(200).json({
                    totalPages: (_a = Math.ceil(resp[0] / pageSize)) !== null && _a !== void 0 ? _a : 0,
                    totalData: (_b = resp[1]) === null || _b === void 0 ? void 0 : _b.length,
                    data: resp[1],
                });
                // } else {
                //   res.status(202).json({ message: `no records found` })
                // }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchCurriculumList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.structure.findMany({
                    where: { status: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchCurriculum(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.structure.findUnique({
                    where: {
                        id: req.params.id
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postCurriculum(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { unitId, programId, courseId } = req.body;
                delete req.body.courseId;
                delete req.body.programId;
                delete req.body.unitId;
                const resp = yield ais.structure.create({
                    data: Object.assign(Object.assign(Object.assign(Object.assign({}, req.body), programId && ({ program: { connect: { id: programId } } })), courseId && ({ course: { connect: { id: courseId } } })), unitId && ({ unit: { connect: { id: unitId } } }))
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateCurriculum(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { unitId, programId, courseId } = req.body;
                delete req.body.courseId;
                delete req.body.programId;
                delete req.body.unitId;
                const resp = yield ais.structure.update({
                    where: { id: req.params.id },
                    data: Object.assign(Object.assign(Object.assign(Object.assign({}, req.body), programId && ({ program: { connect: { id: programId } } })), courseId && ({ course: { connect: { id: courseId } } })), unitId && ({ unit: { connect: { id: unitId } } }))
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteCurriculum(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.structure.delete({
                    where: { id: req.params.id }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Schemes */
    fetchSchemes(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 9, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            OR: [
                                { title: { contains: keyword } },
                            ],
                        }
                    };
                const resp = yield ais.$transaction([
                    ais.scheme.count(Object.assign({}, (searchCondition))),
                    ais.scheme.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize), include: {
                            _count: {
                                select: { program: true }
                            }
                        } }))
                ]);
                //if(resp && resp[1]?.length){
                res.status(200).json({
                    totalPages: (_a = Math.ceil(resp[0] / pageSize)) !== null && _a !== void 0 ? _a : 0,
                    totalData: (_b = resp[1]) === null || _b === void 0 ? void 0 : _b.length,
                    data: resp[1],
                });
                //} else {
                //res.status(202).json({ message: `no records found` })
                //}
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchSchemeList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.scheme.findMany({
                    where: { status: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchScheme(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.scheme.findUnique({
                    where: {
                        id: req.params.id
                    },
                    include: { program: true }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postScheme(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.scheme.create({
                    data: Object.assign({}, req.body),
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateScheme(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.scheme.update({
                    where: {
                        id: req.params.id
                    },
                    data: Object.assign({}, req.body)
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteScheme(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.scheme.delete({
                    where: { id: req.params.id }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Registrations */
    fetchRegistrationList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.activityRegister.findMany({
                    where: { session: { default: true } },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        student: {
                            select: {
                                fname: true, mname: true, lname: true,
                                semesterNum: true, id: true,
                                program: { select: { longName: true } }
                            }
                        }
                    }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchRegistrations(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 9, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            session: { default: true },
                            OR: [
                                { indexno: { contains: keyword } },
                                { student: { fname: { contains: keyword } } },
                                { student: { mname: { contains: keyword } } },
                                { student: { lname: { contains: keyword } } },
                                { student: { id: { contains: keyword } } },
                                { student: { program: { longName: { contains: keyword } } } },
                            ],
                        }
                    };
                const resp = yield ais.$transaction([
                    ais.activityRegister.count(Object.assign({}, (searchCondition))),
                    ais.activityRegister.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize), orderBy: { createdAt: 'desc' }, include: {
                            student: {
                                select: {
                                    fname: true, mname: true, lname: true, indexno: true,
                                    semesterNum: true, id: true, gender: true,
                                    program: { select: { longName: true } }
                                }
                            }
                        } }))
                ]);
                //if(resp && resp[1]?.length){
                res.status(200).json({
                    totalPages: (_a = Math.ceil(resp[0] / pageSize)) !== null && _a !== void 0 ? _a : 0,
                    totalData: (_b = resp[1]) === null || _b === void 0 ? void 0 : _b.length,
                    data: resp[1],
                });
                // } else {
                //    res.status(202).json({ message: `no records found` })
                // }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchRegistration(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.assessment.findMany({
                    include: {
                        course: { select: { title: true, creditHour: true } },
                        student: { select: { id: true, indexno: true, fname: true, mname: true, lname: true, gender: true, semesterNum: true, program: { select: { longName: true, department: true } } } },
                        session: { select: { title: true } },
                    },
                    where: {
                        indexno: req.params.indexno,
                        session: { default: true }
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchRegistrationMount(req, res) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const courses = [];
                const id = req.params.indexno;
                // Get Student Info
                const student = yield ais.student.findUnique({ include: { program: { select: { schemeId: true, hasMajor: true, } } }, where: { id } });
                const indexno = student === null || student === void 0 ? void 0 : student.indexno;
                // Get Active Sessions Info
                const sessions = yield ais.session.findMany({ where: { default: true } });
                // Get Session, If Student is Main(Sept)/Sub(Jan) for AUCC Only
                const session = sessions.find((row) => ((0, moment_1.default)(student === null || student === void 0 ? void 0 : student.entryDate).format("MM") == '01' && (student === null || student === void 0 ? void 0 : student.entrySemesterNum) <= 2) ? row.tag == 'sub' : row.tag == 'main');
                // Get Normal Courses with/without Majors
                const maincourses = yield ais.structure.findMany({
                    include: { course: { select: { title: true, creditHour: true } } },
                    where: { programId: student === null || student === void 0 ? void 0 : student.programId, semesterNum: student === null || student === void 0 ? void 0 : student.semesterNum },
                    orderBy: { type: 'asc' }
                });
                // Meta & Instructions
                const meta = yield ais.structmeta.findFirst({
                    where: { programId: student === null || student === void 0 ? void 0 : student.programId, majorId: student === null || student === void 0 ? void 0 : student.majorId, semesterNum: student === null || student === void 0 ? void 0 : student.semesterNum },
                });
                // Current Posted Bill 
                const groupCode = yield (0, helper_1.getBillCodePrisma)(student === null || student === void 0 ? void 0 : student.semesterNum);
                const bill = yield ais.bill.findFirst({
                    where: {
                        programId: student === null || student === void 0 ? void 0 : student.programId, sessionId: session === null || session === void 0 ? void 0 : session.id, residentialStatus: (student === null || student === void 0 ? void 0 : student.residentialStatus) || 'RESIDENTIAL',
                        OR: groupCode,
                    },
                });
                console.log("Bill", bill);
                // const meta:any = []
                if (student && maincourses.length) {
                    for (const course of maincourses) {
                        courses.push({
                            code: course.courseId,
                            course: (_a = course === null || course === void 0 ? void 0 : course.course) === null || _a === void 0 ? void 0 : _a.title,
                            credit: (_b = course === null || course === void 0 ? void 0 : course.course) === null || _b === void 0 ? void 0 : _b.creditHour,
                            type: course === null || course === void 0 ? void 0 : course.type,
                            lock: course === null || course === void 0 ? void 0 : course.lock,
                            sessionId: session === null || session === void 0 ? void 0 : session.id,
                            schemeId: (_c = student === null || student === void 0 ? void 0 : student.program) === null || _c === void 0 ? void 0 : _c.schemeId,
                            semesterNum: student === null || student === void 0 ? void 0 : student.semesterNum,
                            indexno
                        });
                    }
                }
                // Get Resit Courses
                const resitcourses = yield ais.resit.findMany({
                    include: { course: { select: { title: true, creditHour: true } } },
                    where: { indexno, taken: false, trailSession: { semester: session.semesterNum },
                    }
                });
                if (student && resitcourses.length) {
                    for (const course of resitcourses) {
                        courses.push({
                            code: course.courseId,
                            course: (_d = course === null || course === void 0 ? void 0 : course.course) === null || _d === void 0 ? void 0 : _d.title,
                            credit: (_e = course === null || course === void 0 ? void 0 : course.course) === null || _e === void 0 ? void 0 : _e.creditHour,
                            type: 'R',
                            lock: false,
                            sessionId: session.id,
                            schemeId: (_f = student === null || student === void 0 ? void 0 : student.program) === null || _f === void 0 ? void 0 : _f.schemeId,
                            semesterNum: student.semesterNum,
                            indexno
                        });
                    }
                }
                // Conditions
                let condition = true; // Allow Registration
                let message; // Reason attached
                /*
                   // Check for Exceeded Credit Hours - After
                   // If No courses are not selected! - After
                   // Check whether Total Number of Electives are chosen - After
                   
                   
                   // If student Doesnt Have an Index Number - Before
                      if(!student?.indexno) { condition = false; message = "No Index Number for Student!" }
                   // If Semester Level or Program ID or Major  ID is not Updated, Block Registration - Before
                      if(!student?.programId || (student.program.hasMajor && !student.majorId) || !student?.semesterNum) { condition = false; message = "No Major or Program or Level Set!" }
                   // If Student is Owing Fees, Lock Registration - Before
                      if(student?.accountNet > 0 && student?.accountNet < (Bill amount * Payment Percentage )) { condition = false; message = "No Index Number for Student!" }
                   // If Student is Pardoned by Finance, Allow Registration - Before
                   // If Registration Period is Inactive - Before
                   // If Registration Period is Active and Halt status is ON - Before
                   // If Registration Period is Extended for Late Finers - Before
                   
                
                */
                if (courses.length) {
                    res.status(200).json({ session: session === null || session === void 0 ? void 0 : session.title, courses, meta, condition, message });
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postRegistration(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const courses = req.body;
                const data = [], rdata = [];
                const slip = yield ais.assessment.findMany({ where: { indexno: courses[0].indexno, session: { default: true } } });
                if (slip.length)
                    throw ("Registration already submitted!");
                const resitcourses = courses.filter((row) => row.type == 'R');
                const maincourses = courses.filter((row) => row.type != 'R');
                if (maincourses.length) {
                    for (const course of maincourses) {
                        data.push({
                            courseId: course.code,
                            sessionId: course.sessionId,
                            schemeId: course.schemeId,
                            credit: course.credit,
                            semesterNum: course.semesterNum,
                            indexno: course.indexno,
                            totalScore: 0,
                            type: 'N'
                        });
                    }
                }
                if (resitcourses.length) {
                    // Resit Session Info
                    const rsession = yield ais.resession.findFirst({ where: { default: true } });
                    // Save Resit Registration
                    for (const course of resitcourses) {
                        const ups = yield ais.resit.updateMany({
                            where: {
                                indexno: course === null || course === void 0 ? void 0 : course.indexno,
                                courseId: course === null || course === void 0 ? void 0 : course.code,
                                taken: false
                            },
                            data: {
                                registerSessionId: course === null || course === void 0 ? void 0 : course.sessionId,
                                resitSessionId: rsession === null || rsession === void 0 ? void 0 : rsession.id,
                                taken: true
                            }
                        });
                        if (ups)
                            rdata.push(ups);
                    }
                }
                // Log Registration
                const activityresp = yield ais.activityRegister.create({ data: {
                        indexno: maincourses[0].indexno,
                        sessionId: maincourses[0].sessionId,
                        courses: courses === null || courses === void 0 ? void 0 : courses.length,
                        credits: courses === null || courses === void 0 ? void 0 : courses.reduce((sum, cur) => sum + cur.credit, 0)
                    } });
                // Save Registration Courses
                const mainresp = yield ais.assessment.createMany({ data });
                if (mainresp) {
                    res.status(200).json({ courses: mainresp, resits: rdata, totalCourses: courses.length });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(202).json({ message: error });
            }
        });
    }
    updateRegistration(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const indexno = req.params.indexno;
                const courses = req.body;
                const data = [], rdata = [];
                const resitcourses = courses.filter((row) => row.type == 'R');
                const maincourses = courses.filter((row) => row.type != 'R');
                if (maincourses.length) {
                    for (const course of maincourses) {
                        data.push({
                            courseId: course.courseId,
                            sessionId: course.sessionId,
                            schemeId: course.schemeId,
                            credit: course.credit,
                            semesterNum: course.semesterNum,
                            indexno,
                            totalScore: 0
                        });
                    }
                }
                if (resitcourses.length) {
                    for (const course of resitcourses) {
                        const ups = yield ais.resit.updateMany({
                            where: {
                                indexno,
                                courseId: course.courseId,
                                taken: false
                            },
                            data: {
                                registerSessionId: course.sessionId,
                                resitSessionId: course.sessionId,
                                taken: true
                            }
                        });
                        if (ups)
                            rdata.push(ups);
                    }
                }
                const mainresp = yield ais.assessment.createMany({ data });
                if (mainresp) {
                    res.status(200).json({ courses: mainresp, resits: rdata });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteRegistration(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Delete Courses Registration
                const resp = yield ais.assessment.deleteMany({
                    where: {
                        indexno: req.params.indexno,
                        session: { default: true }
                    }
                });
                // Delete Registration Log
                const log = yield ais.activityRegister.deleteMany({
                    where: {
                        indexno: req.params.indexno,
                        session: { default: true }
                    }
                });
                // Reset Resit Registration
                const resit = yield ais.resit.updateMany({
                    where: {
                        indexno: req.params.indexno,
                        registerSession: { default: true }
                    },
                    data: {
                        taken: false,
                        resitSessionId: null,
                        registerSessionId: null,
                    }
                });
                if (resp === null || resp === void 0 ? void 0 : resp.count) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `Registration not deleted` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* programs */
    fetchProgramList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.program.findMany({
                    where: { status: true },
                    include: {
                        department: { select: { title: true } },
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchPrograms(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 6, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            OR: [
                                { code: { contains: keyword } },
                                { shortName: { contains: keyword } },
                                { longName: { contains: keyword } },
                                { prefix: { contains: keyword } },
                            ],
                        }
                    };
                const resp = yield ais.$transaction([
                    ais.program.count(Object.assign({}, (searchCondition))),
                    ais.program.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize), include: {
                            department: { select: { title: true } },
                            student: { select: { _count: true } }
                        } }))
                ]);
                //if(resp && resp[1]?.length){
                res.status(200).json({
                    totalPages: (_a = Math.ceil(resp[0] / pageSize)) !== null && _a !== void 0 ? _a : 0,
                    totalData: (_b = resp[1]) === null || _b === void 0 ? void 0 : _b.length,
                    data: resp[1],
                });
                //} else {
                //res.status(202).json({ message: `no records found` })
                //}
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchProgram(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.program.findUnique({
                    where: {
                        id: req.params.id
                    },
                    include: {
                        department: { select: { title: true } },
                        student: { select: { _count: true } }
                    }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchProgramStructure(req, res) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.program.findUnique({
                    where: { id: req.params.id },
                    include: {
                        structure: {
                            select: {
                                id: true,
                                type: true,
                                semesterNum: true,
                                course: { select: { title: true, creditHour: true, id: true, practicalHour: true, theoryHour: true } }
                            },
                            orderBy: [{ semesterNum: 'asc' }, { type: 'asc' },]
                        },
                        structmeta: {
                            select: {
                                id: true,
                                minCredit: true,
                                maxCredit: true,
                                maxElectiveNum: true,
                                semesterNum: true,
                                major: { select: { longName: true } }
                            },
                            orderBy: [{ semesterNum: 'asc' },]
                        }
                    },
                });
                if ((_a = resp === null || resp === void 0 ? void 0 : resp.structure) === null || _a === void 0 ? void 0 : _a.length) {
                    var mdata = new Map(), sdata = new Map();
                    for (const sv of resp === null || resp === void 0 ? void 0 : resp.structure) {
                        const index = (_b = `LEVEL ${Math.ceil(sv.semesterNum / 2) * 100}, ${sv.semesterNum % 2 == 0 ? 'SEMESTER 2' : 'SEMESTER 1'}`) !== null && _b !== void 0 ? _b : 'none';
                        const zd = Object.assign(Object.assign({}, sv), { course: (_c = sv === null || sv === void 0 ? void 0 : sv.course) === null || _c === void 0 ? void 0 : _c.title, code: (_d = sv === null || sv === void 0 ? void 0 : sv.course) === null || _d === void 0 ? void 0 : _d.id, credit: (_e = sv === null || sv === void 0 ? void 0 : sv.course) === null || _e === void 0 ? void 0 : _e.creditHour, practical: (_f = sv === null || sv === void 0 ? void 0 : sv.course) === null || _f === void 0 ? void 0 : _f.practicalHour, theory: (_g = sv === null || sv === void 0 ? void 0 : sv.course) === null || _g === void 0 ? void 0 : _g.theoryHour, type: sv === null || sv === void 0 ? void 0 : sv.type });
                        // Data By Level - Semester
                        if (mdata.has(index)) {
                            mdata.set(index, [...mdata.get(index), Object.assign({}, zd)]);
                        }
                        else {
                            mdata.set(index, [Object.assign({}, zd)]);
                        }
                    }
                    for (const sv of resp === null || resp === void 0 ? void 0 : resp.structmeta) {
                        const index = (_h = `LEVEL ${Math.ceil(sv.semesterNum / 2) * 100}, ${sv.semesterNum % 2 == 0 ? 'SEMESTER 2' : 'SEMESTER 1'}`) !== null && _h !== void 0 ? _h : 'none';
                        const zd = Object.assign({}, sv);
                        // Data By Level - Semester
                        if (sdata.has(index)) {
                            sdata.set(index, [...sdata.get(index), Object.assign({}, zd)]);
                        }
                        else {
                            sdata.set(index, [Object.assign({}, zd)]);
                        }
                    }
                    console.log(Object.fromEntries(sdata));
                    res.status(200).json({ data: Array.from(mdata), meta: Object.fromEntries(sdata) });
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchProgramStudents(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.program.findUnique({
                    where: { id: req.params.id },
                    include: {
                        student: {
                            where: { completeStatus: false },
                            select: {
                                id: true,
                                indexno: true,
                                fname: true,
                                mname: true,
                                lname: true,
                                gender: true,
                                semesterNum: true,
                                residentialStatus: true,
                                deferStatus: true,
                            },
                            orderBy: { semesterNum: 'asc' }
                        }
                    },
                });
                if ((_a = resp === null || resp === void 0 ? void 0 : resp.student) === null || _a === void 0 ? void 0 : _a.length) {
                    var mdata = new Map();
                    for (const sv of resp === null || resp === void 0 ? void 0 : resp.student) {
                        const index = (_b = `LEVEL ${Math.ceil(sv.semesterNum / 2) * 100}`) !== null && _b !== void 0 ? _b : 'none';
                        const zd = Object.assign({}, sv);
                        // Data By Level - Semester
                        if (mdata.has(index)) {
                            mdata.set(index, [...mdata.get(index), Object.assign({}, zd)]);
                        }
                        else {
                            mdata.set(index, [Object.assign({}, zd)]);
                        }
                    }
                    res.status(200).json(Array.from(mdata));
                }
                else {
                    res.status(200).json([]);
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchProgramStatistics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.program.findUnique({
                    where: {
                        id: req.params.id
                    },
                    include: {
                        department: { select: { title: true } },
                    }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postProgram(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { unitId, schemeId } = req.body;
                delete req.body.schemeId;
                delete req.body.unitId;
                const resp = yield ais.program.create({
                    data: Object.assign(Object.assign(Object.assign({}, req.body), unitId && ({ department: { connect: { id: unitId } } })), schemeId && ({ scheme: { connect: { id: schemeId } } }))
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateProgram(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { unitId, schemeId } = req.body;
                delete req.body.schemeId;
                delete req.body.unitId;
                const resp = yield ais.program.update({
                    where: { id: req.params.id },
                    data: Object.assign(Object.assign(Object.assign({}, req.body), unitId && ({ department: { connect: { id: unitId } } })), schemeId && ({ scheme: { connect: { id: schemeId } } }))
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteProgram(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.program.delete({
                    where: { id: req.params.id }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Departments */
    fetchDepartments(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.unit.findMany({
                    where: { status: true, levelNum: 2, type: 'ACADEMIC' },
                    include: {
                        level1: { select: { title: true, code: true } },
                        _count: {
                            select: {
                                staff: true,
                                program: true
                            }
                        },
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Faculties */
    fetchFaculties(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.unit.findMany({
                    where: { status: true, levelNum: 1, type: 'ACADEMIC' },
                    include: {
                        levelone: { select: { _count: { select: { program: true } } } },
                        _count: {
                            select: {
                                staff: true,
                                levelone: true
                            }
                        },
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Units */
    fetchUnits(req, res) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 6, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            OR: [
                                { title: { contains: keyword } },
                                { code: { contains: keyword } },
                            ],
                        },
                        include: { level1: true },
                        //   orderBy: { createdAt: 'asc'}
                    };
                const resp = yield ais.$transaction([
                    ais.unit.count(Object.assign({}, (searchCondition))),
                    ais.unit.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize) }))
                ]);
                if (resp && ((_a = resp[1]) === null || _a === void 0 ? void 0 : _a.length)) {
                    res.status(200).json({
                        totalPages: (_b = Math.ceil(resp[0] / pageSize)) !== null && _b !== void 0 ? _b : 0,
                        totalData: (_c = resp[1]) === null || _c === void 0 ? void 0 : _c.length,
                        data: resp[1],
                    });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchUnitList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.unit.findMany({
                    where: { status: true },
                    include: { level1: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchUnit(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.unit.findUnique({
                    where: {
                        id: req.params.id
                    },
                    include: { level1: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postUnit(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { level1Id } = req.body;
                delete req.body.level1Id;
                const resp = yield ais.unit.create({
                    data: Object.assign(Object.assign({}, req.body), level1Id && ({ level1: { connect: { id: level1Id } } })),
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateUnit(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { level1Id } = req.body;
                delete req.body.level1Id;
                const resp = yield ais.unit.update({
                    where: {
                        id: req.params.id
                    },
                    data: Object.assign(Object.assign(Object.assign({}, req.body), level1Id && ({ level1: { connect: { id: level1Id } } })), !level1Id && ({ level1: { disconnect: true } }))
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteUnit(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.unit.delete({
                    where: { id: req.params.id }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Jobs */
    fetchJobs(req, res) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 6, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            OR: [
                                { title: { contains: keyword } },
                                { id: { contains: keyword } },
                            ],
                        },
                        include: {
                            level1: { select: { title: true, code: true } }
                        },
                    };
                const resp = yield ais.$transaction([
                    ais.job.count(Object.assign({}, (searchCondition))),
                    ais.job.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize) }))
                ]);
                if (resp && ((_a = resp[1]) === null || _a === void 0 ? void 0 : _a.length)) {
                    res.status(200).json({
                        totalPages: (_b = Math.ceil(resp[0] / pageSize)) !== null && _b !== void 0 ? _b : 0,
                        totalData: (_c = resp[1]) === null || _c === void 0 ? void 0 : _c.length,
                        data: resp[1],
                    });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchJobList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.job.findMany({
                    where: { status: true }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchJob(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.job.findUnique({
                    where: {
                        id: req.params.id
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postJob(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.job.create({
                    data: Object.assign({}, req.body),
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateJob(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.job.update({
                    where: {
                        id: req.params.id
                    },
                    data: Object.assign({}, req.body)
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteJob(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.job.delete({
                    where: { id: req.params.id }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Progression */
    fetchProgressions(req, res) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 6, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            OR: [
                                { title: { contains: keyword } },
                                { id: { contains: keyword } },
                            ],
                        },
                        include: {
                            student: true,
                            session: true
                        },
                    };
                const resp = yield ais.$transaction([
                    ais.activityProgress.count(Object.assign({}, (searchCondition))),
                    ais.activityProgress.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize) }))
                ]);
                if (resp && ((_a = resp[1]) === null || _a === void 0 ? void 0 : _a.length)) {
                    res.status(200).json({
                        totalPages: (_b = Math.ceil(resp[0] / pageSize)) !== null && _b !== void 0 ? _b : 0,
                        totalData: (_c = resp[1]) === null || _c === void 0 ? void 0 : _c.length,
                        data: resp[1],
                    });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    // async fetchJobList(req: Request,res: Response) {
    //    try {
    //       const resp = await ais.job.findMany({
    //          where: { status: true }
    //       })
    //       if(resp){
    //          res.status(200).json(resp)
    //       } else {
    //          res.status(202).json({ message: `no record found` })
    //       }
    //    } catch (error: any) {
    //       console.log(error)
    //       return res.status(500).json({ message: error.message }) 
    //    }
    // }
    fetchProgression(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.activityProgress.findUnique({
                    where: {
                        id: req.params.id
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postProgression(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.activityProgress.create({
                    data: Object.assign({}, req.body),
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateProgression(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.activityProgress.update({
                    where: {
                        id: req.params.id
                    },
                    data: Object.assign({}, req.body)
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteProgression(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.activityProgress.delete({
                    where: { id: req.params.id }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Sheets */
    fetchSheets(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 6, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            session: {
                                OR: [
                                    { default: true },
                                    { assignLateSheet: true },
                                ]
                            },
                            OR: [
                                { session: { title: { contains: keyword } } },
                                { course: { title: { contains: keyword } } },
                                { course: { id: { contains: keyword } } },
                                { program: { longName: { contains: keyword } } },
                                { unit: { title: { contains: keyword }, levelNum: 2 } },
                            ],
                        }
                    };
                const resp = yield ais.$transaction([
                    ais.sheet.count(Object.assign({}, (searchCondition))),
                    ais.sheet.findMany(Object.assign(Object.assign({}, (searchCondition &&
                        (Object.assign(Object.assign({}, searchCondition), { include: {
                                session: true,
                                program: true,
                                course: true,
                                major: true,
                                assignee: true,
                            } })))), { skip: offset, take: Number(pageSize), orderBy: [{ sessionId: 'desc' }, { semesterNum: 'asc' }] }))
                ]);
                //if(resp && resp[1]?.length){
                res.status(200).json({
                    totalPages: (_a = Math.ceil(resp[0] / pageSize)) !== null && _a !== void 0 ? _a : 0,
                    totalData: (_b = resp[1]) === null || _b === void 0 ? void 0 : _b.length,
                    data: resp[1],
                });
                // } else {
                //res.status(202).json({ message: `no records found` })
                //}
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    stageSheet(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fetch Active Semester
                const { sessionId } = req.body;
                // Fetch Session Info
                const session = yield ais.session.findFirst({ where: { id: sessionId, default: true } });
                if (session) {
                    // Fetch Mounted Courses all Program Levels
                    let mounts = yield ais.structure.findMany({ where: { status: true } });
                    mounts = mounts.filter((meta) => ((meta === null || meta === void 0 ? void 0 : meta.semesterNum) % 2) == ((session === null || session === void 0 ? void 0 : session.semester) == 'SEM2' ? 0 : 1));
                    // Check whether Sheets are generated 
                    const form = yield ais.sheet.findFirst({ where: { sessionId, status: true } });
                    if (form)
                        res.status(202).json({ message: `no record found` });
                    // Upsert Bulk into Sheet 
                    const resp = yield Promise.all(mounts === null || mounts === void 0 ? void 0 : mounts.map((row) => __awaiter(this, void 0, void 0, function* () {
                        let { courseId, programId, unitId, majorId } = row;
                        return yield ais.sheet.create({ data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ semesterNum: row.semesterNum }, sessionId && ({ session: { connect: { id: sessionId } } })), courseId && ({ course: { connect: { id: courseId } } })), programId && ({ program: { connect: { id: programId } } })), majorId && ({ major: { connect: { id: majorId } } })), unitId && ({ unit: { connect: { id: unitId } } })) });
                    })));
                    //const resp = await ais.sheet.create({ data })
                    if (resp) {
                        // Update Stage Status in Calendar
                        yield ais.session.update({ where: { id: sessionId }, data: { stageSheet: true } });
                        res.status(200).json(resp);
                    }
                    else {
                        res.status(202).json({ message: `no record found` });
                    }
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    loadSheet(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fetch Active Semester
                const { sheetId } = req.body;
                console.log("SHEET ID: ", sheetId);
                // Fetch Session Info
                const sheet = yield ais.sheet.findFirst({ where: { id: sheetId, status: true }, include: { program: true, unit: true, session: true, course: true, major: true } });
                if (sheet) {
                    // Fetch Mounted Courses all Program Levels
                    let mounts = yield ais.assessment.findMany({
                        where: {
                            status: true,
                            semesterNum: sheet.semesterNum,
                            sessionId: sheet === null || sheet === void 0 ? void 0 : sheet.sessionId,
                            courseId: sheet === null || sheet === void 0 ? void 0 : sheet.courseId,
                            student: { programId: sheet === null || sheet === void 0 ? void 0 : sheet.programId },
                        },
                        include: { student: true, scheme: true },
                        orderBy: [{ student: { fname: 'asc' } },]
                    });
                    mounts = mounts.filter((st, i) => sheet.majorId == st.student.majorId && sheet.studyMode == st.student.studyMode);
                    let resp = mounts === null || mounts === void 0 ? void 0 : mounts.map((row) => {
                        var _a, _b;
                        const grade = (0, helper_1.getGrade)(row.totalScore, (_a = row.scheme) === null || _a === void 0 ? void 0 : _a.gradeMeta);
                        const gradepoint = (0, helper_1.getGradePoint)(row.totalScore, (_b = row.scheme) === null || _b === void 0 ? void 0 : _b.gradeMeta);
                        return (Object.assign(Object.assign({}, row), { grade,
                            gradepoint }));
                    });
                    if (resp) {
                        res.status(200).json(resp);
                    }
                    else {
                        res.status(202).json({ message: `no record found` });
                    }
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    saveSheet(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fetch Active Semester
                const { count, data } = req.body;
                console.log(req.body);
                let mounts = [];
                const courseId = data[`cid`];
                const sessionId = data[`sid`];
                for (let i = 0; i < count; i++) {
                    const scoreA = data[`${i}_scorea`] ? parseFloat(data[`${i}_scorea`]) : null;
                    const scoreB = data[`${i}_scoreb`] ? parseFloat(data[`${i}_scoreb`]) : null;
                    const scoreC = data[`${i}_scorec`] ? parseFloat(data[`${i}_scorec`]) : null;
                    const classScore = (scoreA && scoreB && scoreC) ? (scoreA + scoreB + scoreC) : (scoreA && scoreB && !scoreC) ? (scoreA + scoreB) : parseFloat(data[`${i}_class`]);
                    const examScore = parseFloat(data[`${i}_exam`]);
                    const totalScore = classScore + examScore;
                    const indexno = data[`${i}_idx`];
                    const id = data[`${i}_id`];
                    mounts.push({
                        where: { id, course: { id: courseId }, session: { id: sessionId }, indexno },
                        data: {
                            // ... scoreA && ({ scoreA }),
                            // ... scoreB && ({ scoreB }),
                            // ... scoreC && ({ scoreC }),
                            scoreA,
                            scoreB,
                            scoreC,
                            classScore,
                            examScore,
                            totalScore,
                        }
                    });
                }
                // Bulk Score Update 
                const resp = yield Promise.all(mounts === null || mounts === void 0 ? void 0 : mounts.map((query) => __awaiter(this, void 0, void 0, function* () {
                    return yield ais.assessment.updateMany(query);
                })));
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    stageAuccSheet(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fetch Active Semester
                const { sessionId } = req.body;
                let loopcount = 0;
                // Check whether Sheets are generated 
                const form = yield ais.sheet.findFirst({ where: { sessionId, status: true } });
                if (form)
                    res.status(202).json({ message: `no record found` });
                // Fetch Session Info
                const session = yield ais.session.findFirst({ where: { id: sessionId, default: true } });
                if (session) {
                    if ((session === null || session === void 0 ? void 0 : session.tag) == 'main') {
                        // Fetch Mounted Courses all Program Levels
                        const mounts = yield ais.structure.findMany({ where: { status: true, program: { status: true } }, include: { program: true } });
                        if (mounts === null || mounts === void 0 ? void 0 : mounts.length) {
                            for (let meta of mounts) {
                                if (meta.semesterNum % 2 == (session.semester == 'SEM2' ? 1 : 0))
                                    continue;
                                var sessionModes = [];
                                switch ((_a = meta === null || meta === void 0 ? void 0 : meta.program) === null || _a === void 0 ? void 0 : _a.category) {
                                    case "CP":
                                        sessionModes = ["M"];
                                        break;
                                    case "DP":
                                        sessionModes = ["M", "E", "W"];
                                        break;
                                    case "UG":
                                        sessionModes = ["M", "E", "W"];
                                        break;
                                    case "PG":
                                        sessionModes = ["W"];
                                        break;
                                }
                                // Run Data For All Existing Session Modes
                                if (sessionModes === null || sessionModes === void 0 ? void 0 : sessionModes.length) {
                                    const resp = yield Promise.all(sessionModes === null || sessionModes === void 0 ? void 0 : sessionModes.map((mode) => __awaiter(this, void 0, void 0, function* () {
                                        let { courseId, programId, unitId, majorId } = meta;
                                        return yield ais.sheet.create({ data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ semesterNum: meta.semesterNum, studyMode: mode }, sessionId && ({ session: { connect: { id: sessionId } } })), courseId && ({ course: { connect: { id: courseId } } })), programId && ({ program: { connect: { id: programId } } })), majorId && ({ major: { connect: { id: majorId } } })), unitId && ({ unit: { connect: { id: unitId } } })) });
                                    })));
                                    if (resp.length)
                                        loopcount += resp.length;
                                }
                            }
                        }
                    }
                    else {
                        // JAN - SUB STREAM
                        const code = session === null || session === void 0 ? void 0 : session.admissionPrefix;
                        if (code) { // Only Set for January Sessions - not Main Session
                            // Check Student if students admitted
                            const st = yield ais.$queryRaw `select * from ais_student where date_format(entryDate,'%m%y') = ${code} and semesterNum < 5`;
                            // Fetch Mounted Courses all Program Levels
                            let mounts = yield ais.structure.findMany({ where: { status: true, semesterNum: { lt: 5 }, program: { status: true } }, include: { program: true } });
                            // Filter Mounted to Some Specific course and programs
                            let holder = new Set();
                            for (const s of st) {
                                if (!holder.has(`${s.programId}${s.semesterNum}${s.studyMode ? s.studyMode : ""}`))
                                    holder.add(`${s.programId}${s.semesterNum}${s.studyMode ? s.studyMode : ""}`);
                            }
                            mounts = mounts.filter((r) => [1, 2].includes(r.semesterNum) || ([3, 4].includes(r.semesterNum) && holder.has(`${r.programId}${r.semesterNum}${r.studyMode ? r.studyMode : ""}`)));
                            if ((st === null || st === void 0 ? void 0 : st.length) && (mounts === null || mounts === void 0 ? void 0 : mounts.length)) {
                                for (let meta of mounts) {
                                    if (meta.semesterNum % 2 == (session.semester == 'SEM2' ? 1 : 0))
                                        continue;
                                    var sessionModes = [];
                                    switch ((_b = meta === null || meta === void 0 ? void 0 : meta.program) === null || _b === void 0 ? void 0 : _b.category) {
                                        case "CP":
                                            sessionModes = ["M"];
                                            break;
                                        case "DP":
                                            sessionModes = ["M", "E", "W"];
                                            break;
                                        case "UG":
                                            sessionModes = ["M", "E", "W"];
                                            break;
                                        case "PG":
                                            sessionModes = ["W"];
                                            break;
                                    }
                                    // Run Data For All Existing Session Modes
                                    if (sessionModes === null || sessionModes === void 0 ? void 0 : sessionModes.length) {
                                        const resp = yield Promise.all(sessionModes === null || sessionModes === void 0 ? void 0 : sessionModes.map((mode) => __awaiter(this, void 0, void 0, function* () {
                                            let { courseId, programId, unitId, majorId } = meta;
                                            return yield ais.sheet.create({ data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ semesterNum: meta.semesterNum, studyMode: mode }, sessionId && ({ session: { connect: { id: sessionId } } })), courseId && ({ course: { connect: { id: courseId } } })), programId && ({ program: { connect: { id: programId } } })), majorId && ({ major: { connect: { id: majorId } } })), unitId && ({ unit: { connect: { id: unitId } } })) });
                                        })));
                                        if (resp.length)
                                            loopcount += resp.length;
                                    }
                                }
                            }
                        }
                    }
                }
                else {
                    // Session Not Default or Activated
                    res.status(202).json({ message: `Session is not activated!` });
                }
                if (loopcount) {
                    // Update Stage Status in Calendar
                    yield ais.session.update({ where: { id: sessionId }, data: { stageSheet: true } });
                    res.status(200).json(loopcount);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchSheet(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.sheet.findUnique({
                    where: { id: req.params.id },
                    include: {
                        session: { select: { title: true, tag: true } },
                        program: { select: { longName: true, category: true } },
                        course: { select: { title: true, id: true, creditHour: true } },
                        major: { select: { longName: true } },
                        assignee: true,
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchMySheet(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.sheet.findUnique({
                    where: { id: req.params.id },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postSheet(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.job.create({
                    data: Object.assign({}, req.body),
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateSheet(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.job.update({
                    where: {
                        id: req.params.id
                    },
                    data: Object.assign({}, req.body)
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteSheet(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.job.delete({
                    where: { id: req.params.id }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* App Roles */
    fetchARoleList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.appRole.findMany({
                    where: { status: true },
                    include: { app: { select: { title: true } }
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* User Roles */
    fetchURoleList(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { staffId } = req.body;
                const resp = yield ais.userRole.findMany({
                    where: { user: { tag: staffId.toString() } },
                    include: { appRole: { select: { title: true, app: true } } }
                });
                if (resp === null || resp === void 0 ? void 0 : resp.length) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json(error);
            }
        });
    }
    fetchURoles(req, res) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 6, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            OR: [
                                { title: { contains: keyword } },
                                { id: { contains: keyword } },
                            ],
                        },
                        include: {
                            level1: { select: { title: true, code: true } }
                        },
                    };
                const resp = yield ais.$transaction([
                    ais.userRole.count(Object.assign({}, (searchCondition))),
                    ais.userRole.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize) }))
                ]);
                if (resp && ((_a = resp[1]) === null || _a === void 0 ? void 0 : _a.length)) {
                    res.status(200).json({
                        totalPages: (_b = Math.ceil(resp[0] / pageSize)) !== null && _b !== void 0 ? _b : 0,
                        totalData: (_c = resp[1]) === null || _c === void 0 ? void 0 : _c.length,
                        data: resp[1],
                    });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchURole(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.userRole.findUnique({
                    where: {
                        id: Number(req.params.id)
                    },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    postURole(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { appRoleId, staffNo } = req.body;
                delete req.body.appRoleId;
                delete req.body.staffNo;
                let allowRole = true;
                let resp;
                const user = yield ais.user.findFirst({ where: { tag: staffNo.toString() } });
                const uroles = yield ais.userRole.findMany({ where: { userId: user === null || user === void 0 ? void 0 : user.id }, include: { appRole: { select: { app: true } } } });
                const urole = yield ais.appRole.findFirst({ where: { id: Number(appRoleId) }, include: { app: true } });
                if (uroles.length && uroles.find((r) => { var _a, _b, _c; return [(_a = urole === null || urole === void 0 ? void 0 : urole.app) === null || _a === void 0 ? void 0 : _a.tag].includes((_c = (_b = r === null || r === void 0 ? void 0 : r.appRole) === null || _b === void 0 ? void 0 : _b.app) === null || _c === void 0 ? void 0 : _c.tag); }))
                    allowRole = false;
                if (!allowRole)
                    throw (`Privilege exists for app`);
                resp = yield ais.userRole.create({
                    data: Object.assign(Object.assign(Object.assign({}, req.body), appRoleId && ({ appRole: { connect: { id: Number(appRoleId) } } })), user && ({ user: { connect: { id: user === null || user === void 0 ? void 0 : user.id } } })),
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateURole(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.userRole.update({
                    where: {
                        id: Number(req.params.id)
                    },
                    data: Object.assign({}, req.body)
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteURole(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.userRole.delete({
                    where: { id: Number(req.params.id) }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    checkUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.body;
                const resp = yield ais.user.findFirst({ where: { tag: userId.toString() } });
                res.status(200).json(!!resp);
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Staff */
    fetchStaffs(req, res) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, pageSize = 6, keyword = '' } = req.query;
            const offset = (page - 1) * pageSize;
            let searchCondition = {};
            try {
                if (keyword)
                    searchCondition = {
                        where: {
                            OR: [
                                { fname: { contains: keyword } },
                                { lname: { contains: keyword } },
                                { phone: { contains: keyword } },
                                { email: { contains: keyword } },
                            ],
                        }
                    };
                const resp = yield ais.$transaction([
                    ais.staff.count(Object.assign({}, (searchCondition))),
                    ais.staff.findMany(Object.assign(Object.assign({}, (searchCondition)), { skip: offset, take: Number(pageSize), include: {
                            title: { select: { label: true } },
                            country: { select: { longName: true } },
                            region: { select: { title: true } },
                            religion: { select: { title: true } },
                            marital: { select: { title: true } },
                            unit: { select: { title: true } },
                            job: { select: { title: true } },
                            //promotion:{ select: { job: { select: { title:true }}}},
                        } }))
                ]);
                if (resp && ((_a = resp[1]) === null || _a === void 0 ? void 0 : _a.length)) {
                    res.status(200).json({
                        totalPages: (_b = Math.ceil(resp[0] / pageSize)) !== null && _b !== void 0 ? _b : 0,
                        totalData: (_c = resp[1]) === null || _c === void 0 ? void 0 : _c.length,
                        data: resp[1],
                    });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchStaff(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.staff.findUnique({
                    where: {
                        staffNo: req.params.id
                    },
                    include: {
                        title: { select: { label: true } },
                        country: { select: { longName: true } },
                        region: { select: { title: true } },
                        religion: { select: { title: true } },
                        marital: { select: { title: true } },
                        unit: { select: { title: true } },
                        job: { select: { title: true } },
                        //promotion:{ select: { job: { select: { title:true }}}},
                    }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    stageStaff(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { staffId } = req.body;
                const password = pwdgen();
                const isUser = yield ais.user.findFirst({ where: { tag: staffId.toString(), groupId: 2 } });
                if (isUser)
                    throw ("Staff User Account Exists!");
                const ssoData = { tag: staffId.toString(), username: staffId.toString(), password: sha1(password) }; // Others
                // Populate SSO Account
                const resp = yield ais.user.create({
                    data: Object.assign(Object.assign({}, ssoData), { group: { connect: { id: 2 } } }),
                });
                if (resp) {
                    // Send Password By SMS
                    // Send Password By Email
                    res.status(200).json(Object.assign(Object.assign({}, resp), { password }));
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json(error);
            }
        });
    }
    resetStaff(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { staffId } = req.body;
                const password = pwdgen();
                const resp = yield ais.user.updateMany({
                    where: { tag: staffId.toString(), groupId: 2 },
                    data: { password: sha1(password) },
                });
                if (resp === null || resp === void 0 ? void 0 : resp.count) {
                    res.status(200).json({ password });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json(error);
            }
        });
    }
    staffRole(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { staffId } = req.body;
                const resp = yield ais.userRole.findMany({
                    where: { user: { tag: staffId.toString() } },
                    include: { appRole: { select: { title: true, app: true } } }
                });
                if (resp === null || resp === void 0 ? void 0 : resp.length) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json(error);
            }
        });
    }
    changeStaffPhoto(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { staffId } = req.body;
                const password = pwdgen();
                const resp = yield ais.user.updateMany({
                    where: { tag: staffId },
                    data: { password: sha1(password) },
                });
                if (resp) {
                    res.status(200).json({ password });
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json(error);
            }
        });
    }
    postStaff(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { titleId, maritalId, countryId, regionId, religionId, unitId, jobId, staffNo } = req.body;
                delete req.body.titleId;
                delete req.body.maritalId;
                delete req.body.countryId;
                delete req.body.regionId;
                delete req.body.religionId;
                delete req.body.unitId;
                delete req.body.jobId;
                //  delete req.body.staffNo; 
                const resp = yield ais.staff.create({
                    data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, req.body), maritalId && ({ marital: { connect: { id: maritalId } } })), titleId && ({ title: { connect: { id: titleId } } })), countryId && ({ country: { connect: { id: countryId } } })), regionId && ({ region: { connect: { id: regionId } } })), religionId && ({ religion: { connect: { id: religionId } } })), unitId && ({ unit: { connect: { id: unitId } } })), jobId && ({ job: { connect: { id: jobId } } }))
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    updateStaff(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { titleId, maritalId, countryId, regionId, religionId, unitId, jobId } = req.body;
                delete req.body.titleId;
                delete req.body.maritalId;
                delete req.body.countryId;
                delete req.body.regionId;
                delete req.body.religionId;
                delete req.body.unitId;
                delete req.body.jobId; //   
                req.body.staffNo = req.body.staffNo.toString();
                const resp = yield ais.staff.update({
                    where: { staffNo: req.params.id },
                    data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, req.body), maritalId && ({ marital: { connect: { id: maritalId } } })), titleId && ({ title: { connect: { id: titleId } } })), countryId && ({ country: { connect: { id: countryId } } })), regionId && ({ region: { connect: { id: regionId } } })), religionId && ({ religion: { connect: { id: religionId } } })), unitId && ({ unit: { connect: { id: unitId } } })), jobId && ({ job: { connect: { id: jobId } } }))
                });
                if (resp) {
                    if (req.params.id != req.body.staffNo) {
                        // Update SSO User with New (Tag/Username)
                        yield ais.user.updateMany({ where: { tag: req.params.id, groupId: 2 }, data: { tag: req.body.staffNo, username: req.body.staffNo } });
                        // Update Photo FileName
                        const tag = req.params.id.split("/").join("").trim().toLowerCase();
                        const dtag = req.body.staffNo.split("/").join("").trim().toLowerCase();
                        var file = path_1.default.join(__dirname, "/../../public/cdn/photo/staff/", tag + '.jpg');
                        //var file2 = path.join(__dirname,"/../../public/cdn/photo/staff/",tag+'.jpeg');
                        var dfile = path_1.default.join(__dirname, "/../../public/cdn/photo/staff/", dtag + '.jpg');
                        var stats = fs_1.default.statSync(file);
                        //var stats2 = fs.statSync(file2);
                        if (stats) {
                            fs_1.default.renameSync(file, dfile);
                        }
                        //   else if (stats2) {
                        //     fs.renameSync(file2,dfile);
                        //   }
                    }
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    deleteStaff(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.staff.delete({
                    where: { staffNo: req.params.id }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `No records found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Helpers */
    fetchCountries(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.country.findMany({
                    where: { status: true },
                    orderBy: { createdAt: 'asc' }
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchRegions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.region.findMany({
                    where: { status: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchReligions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.religion.findMany({
                    where: { status: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchDisabilities(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.disability.findMany({
                    where: { status: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchCategories(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.category.findMany({
                    where: { status: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchRelations(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.relation.findMany({
                    where: { status: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchMarital(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.marital.findMany({
                    where: { status: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchTitles(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.title.findMany({
                    where: { status: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchVendors(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.vendor.findMany({
                    where: { status: true },
                });
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchCollectors(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.collector.findMany();
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    fetchAppRoles(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield ais.appRole.findMany();
                if (resp) {
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    runData(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let resp;
                // const subjects:any = require('../../util/subjects.json');
                // const structure:any = require('../../util/structure.json');
                // const courses:any = require('../../util/courses2.json');
                //  const students = require('../../util/active_student.json');
                //   const staff = require('../../util/staff.json');
                //  const users = require('../../util/users.json');
                //  const jobs = require('../../util/job.json');
                //  const scores = require('../../util/_calendar.json');
                //const scores = require('../../util/_scheme.json');
                //  const scores = require('../../util/units.json');
                // const courses = require('../../util/aucc_courses.json');
                // const courses = require('../../util/courses.json');
                // if(courses.length){
                //   for(const course of courses){
                //      console.log(course)
                //      const ins = await ais.course.create({
                //          data: {
                //             id: course.course_code,
                //             title: course.title?.toUpperCase(),
                //             creditHour: Number(course.credit),
                //             remark:'ACTIVE'
                //          }
                //      })
                //   }
                // }
                //  if(jobs.length){
                //    for(const subj of jobs){
                //       console.log(subj)
                //       const ins = await ais.job.create({
                //           data: {
                //              title: subj?.title, 
                //              type: subj?.type, 
                //              staffCategory: subj?.staff_group, 
                //              status: true
                //           }
                //       })
                //       console.log(ins)
                //    }
                //  }
                // if(students.length){
                //   for(const student of students){
                //      console.log(student)
                //      const ins = await ais.student.create({
                //          data: {
                //             id: student?.refno,
                //             indexno: student.indexno,
                //             fname: student.fname?.toUpperCase(),
                //             mname: student.mname?.toUpperCase(),
                //             lname: student.lname?.toUpperCase(),
                //             ... student?.dob && ({ dob: moment(student?.dob,'YYYY-MM-DD').toDate() }),
                //             ... student?.doa && ({ entryDate: moment(student?.doa,'YYYY-MM-DD').toDate() }),
                //             ... student?.doc && ({ exitDate: moment(student?.doc,'YYYY-MM-DD').toDate() }),
                //             entryGroup: student.entry_group,
                //             semesterNum: Number(student?.semester),
                //             phone: student.phone?.replace("+233","0")?.substring(0,10),
                //             email: student.email,
                //             gender: student.gender,
                //             guardianName: student.guardian_name,
                //             guardianPhone: student.guardian_phone,
                //             instituteEmail: student.institute_email,
                //             completeStatus: student.complete_status == 1 ? true : false,
                //             deferStatus: student.defer_status == 1 ? true : false,
                //             graduateStatus: student.graduate_status == 1 ? true : false,
                //             studyMode: student.session,
                //             ... student?.transact_account && ({ accountNet: parseFloat(student.transact_account) }),
                //             ... student?.entry_semester && ({ entrySemesterNum: Number(student.entry_semester) }),
                //             ... student?.prog_id && ({ program: { connect: { id: student?.prog_id }} }),
                //             ... student?.major_id && ({ major: { connect: { id: student?.major_id }} }),
                //             ... student?.country_id && ({ country: { connect: { id: student?.country_id }} }),
                //             //country: { connect: { id: "96b0a1d5-7899-4b9a-bcbe-7a72eee6572c" } },
                //          }
                //      })
                //   }
                // }
                // if(staff.length){
                //    for(const st of staff){
                //       console.log(st)
                //       const ins = await ais.staff.create({
                //           data: {
                //              staffNo: st?.staff_no?.toString(),
                //              fname: st.fname?.toUpperCase(),
                //              mname: st.mname?.toUpperCase(),
                //              lname: st.lname?.toUpperCase(),
                //              dob: st?.dob && moment(st?.dob,'YYYY-MM-DD').toDate(),
                //              phone: st.phone,
                //              email: st.email,
                //              residentAddress: st.address,
                //              gender: st.gender,
                //              hometown: st.hometown,
                //              birthplace: st.birth_place,
                //              ssnitNo: st.ssnit,
                //              instituteEmail: st.inst_mail,
                //              qualification: st.position,
                //             //  religion: { connect: { id: st.religionId }},
                //             ... st.unit_id && ({ unit: { connect: { id: st.unit_id?.toString() }}}),
                //             ... st.job_id && ({ job: { connect: { id: st.job_id?.toString() }}}),
                //             // job: { connect: { id: st.job_id }},
                //             country: { connect: { id: "96b0a1d5-7899-4b9a-bcbe-7a72eee6572c" }},
                //           }
                //       })
                //    }
                // }
                // if(structure.length){
                //   for(const struct of structure){
                //      console.log(struct)
                //      const ins = await ais.structure.create({
                //          data: {
                //             course: { connect: { id: struct.courseId }},
                //             unit: { connect: { id: struct.unitId }},
                //             program: { connect: { id: struct.programId }},
                //             type: struct.type,
                //             semesterNum: Number(struct.semesterNum),
                //          }
                //      })
                //   }
                // }
                //  if(subjects.length){
                //   for(const subj of subjects){
                //      console.log(subj)
                //      const ins = await ais.subject.create({
                //          data: {
                //             title: subj?.title 
                //          }
                //      })
                //   }
                // }
                // if(scores.length){
                //    for(const st of scores){
                //       console.log(st)
                //       const ins = await ais.assessment.create({
                //           data: {
                //              //indexno: st?.indexno,
                //              credit: Number(st.credit),
                //              semesterNum: Number(st.semesterNum),
                //              classScore: parseFloat(st.classScore),
                //              examScore: parseFloat(st.examScore),
                //              totalScore: parseFloat(st.totalScore),
                //              type: 'N',
                //              session: {
                //                 connect: {
                //                    id: st.sessionId
                //                 }
                //              },
                //              scheme: {
                //                connect: {
                //                   id: st.schemeId
                //                }
                //             },
                //             course: {
                //                connect: {
                //                   id: st.courseId?.trim()
                //                }
                //             },
                //             student: {
                //                connect: {
                //                   indexno: st.indexno?.trim()
                //                }
                //             },
                //           }
                //       })
                //    }
                // }
                //  if(scores.length){
                //   for(const subj of scores){
                //      console.log(subj)
                //      const ins = await ais.unit.create({
                //          data: {
                //             code: subj?.code, 
                //             title: subj?.title, 
                //             type: subj?.type, 
                //             location: subj?.location, 
                //             levelNum: Number(subj?.level), 
                //          }
                //      })
                //   }
                // }
                // if(scores.length){
                //    for(const subj of scores){
                //       console.log(subj)
                //       const ins = await ais.major.create({
                //           data: {
                //              shortName: subj?.title, 
                //              longName: subj?.title, 
                //              status: true
                //           }
                //       })
                //    }
                //  }
                // if(scores.length){
                //    for(const subj of scores){
                //       console.log(subj)
                //       const ins = await ais.program.create({
                //           data: {
                //              code: subj?.code, 
                //              prefix: subj?.prefix, 
                //              shortName: subj?.short, 
                //              longName: subj?.long, 
                //              category: subj?.group_id, 
                //              semesterTotal: Number(subj?.semesters), 
                //              creditTotal: Number(subj?.credits), 
                //           }
                //       })
                //    }
                //  }
                // if(scores.length){
                //    for(const subj of scores){
                //       console.log(subj)
                //       const ins:any = await ais.student.create({
                //          data: {
                //             id: subj?.refno,
                //             indexno: subj.indexno,
                //             fname: subj.fname?.toUpperCase() || '',
                //             mname: subj.mname?.toUpperCase() || '',
                //             lname: subj.lname?.toUpperCase() || '',
                //             //dob: moment(subj?.dob,'DD/MM/YYYY').toDate(),
                //             semesterNum: Number(subj.semester) || 0,
                //             phone: subj.phone,
                //             email: subj.email,
                //             gender: subj.gender,
                //             completeStatus: !!subj.complete_status,
                //             deferStatus: !!subj.defer_status,
                //             graduateStatus: !!subj.graduate_status,
                //             // program: {
                //             //    connect: {
                //             //       id: subj.programId
                //             //    }
                //             // },
                //             country: {
                //                connect: {
                //                   id: "96b0a1d5-7899-4b9a-bcbe-7a72eee6572c"
                //                }
                //             },
                //          },
                //       })
                //    }
                //  }
                // if(scores.length){
                //    for(const subj of scores){
                //       console.log(subj)
                //       const ins:any = await ais.student.upsert({
                //          where: { id: subj?.refno },
                //          create: {
                //             id: subj?.refno,
                //             indexno: subj.indexno,
                //             fname: subj.fname?.toUpperCase() || '',
                //             mname: subj.mname?.toUpperCase() || '',
                //             lname: subj.lname?.toUpperCase() || '',
                //             //dob: moment(subj?.dob,'DD/MM/YYYY').toDate(),
                //             semesterNum: Number(subj.semester) || 0,
                //             phone: subj.phone?.substring(10),
                //             email: subj.email,
                //             gender: subj.gender,
                //             completeStatus: !!subj.complete_status,
                //             deferStatus: !!subj.defer_status,
                //             graduateStatus: !!subj.graduate_status,
                //             // program: {
                //             //    connect: {
                //             //       id: subj.programId
                //             //    }
                //             // },
                //             country: {
                //                connect: {
                //                   id: "96b0a1d5-7899-4b9a-bcbe-7a72eee6572c"
                //                }
                //             },
                //          },
                //          update: {
                //             indexno: subj.indexno,
                //             fname: subj.fname?.toUpperCase() || '',
                //             mname: subj.mname?.toUpperCase() || '',
                //             lname: subj.lname?.toUpperCase() || '',
                //             //dob: moment(subj?.dob,'DD/MM/YYYY').toDate(),
                //             semesterNum: Number(subj.semester) || 0,
                //             phone: subj?.phone?.substring(10),
                //             email: subj.email,
                //             gender: subj.gender,
                //             completeStatus: !!subj.complete_status,
                //             deferStatus: !!subj.defer_status,
                //             graduateStatus: !!subj.graduate_status,
                //             // program: {
                //             //    connect: {
                //             //       id: subj.programId
                //             //    }
                //             // },
                //             country: {
                //                connect: {
                //                   id: "96b0a1d5-7899-4b9a-bcbe-7a72eee6572c"
                //                }
                //             },
                //          },
                //       })
                //    }
                //  }
                //  if(users.length){
                //    for(const subj of users){
                //       console.log(subj)
                //       const ins = await ais.user.create({
                //           data: {
                //              groupId: Number(subj?.group_id), 
                //              tag: subj?.tag, 
                //              username: subj?.username, 
                //              password: subj?.password, 
                //          }
                //       })
                //    }
                //  }
                // if(scores.length){
                //    for(const subj of scores){
                //       console.log(subj)
                //       const ins = await ais.user.upsert({
                //           where: { tag: subj?.tag },
                //           create: {
                //              groupId: Number(subj?.group_id), 
                //              tag: subj?.tag, 
                //              username: subj?.username, 
                //              password: subj?.password, 
                //          },
                //          update: {
                //             username: subj?.username, 
                //             password: subj?.password, 
                //         }
                //       })
                //    }
                //  }
                //  // Calendar
                //  if(scores.length){
                //    for(const subj of scores){
                //       console.log(subj)
                //       const ins = await ais.session.create({
                //          data: {
                //             tag: subj?.tag, 
                //             title: subj?.title, 
                //             year: subj?.academic_year?.toString(), 
                //             semester: subj?.academic_sem == '1' ? 'SEM1':'SEM2', 
                //             default: !!subj?.default, 
                //             status: !!subj?.status
                //          }
                //       })
                //    }
                //  }
                //  // Schemes
                //  if(scores.length){
                //    for(const subj of scores){
                //       console.log(subj)
                //       const ins = await ais.scheme.create({
                //          data: {
                //             title: subj?.title, 
                //             gradeMeta: subj?.grade_meta || null, 
                //             classMeta: subj?.class_meta || null, 
                //             passMark: 0, 
                //          }
                //       })
                //    }
                //  }
                /* ADMISSION MIGRATIONS  */
                //const sessions = require('../../util/ams/session.json');
                //const letters = require('../../util/ams/letter.json');
                const vouchers = require('../../util/ams/voucher.json');
                //  if(vouchers.length){  // VOUCHERS
                //    for(const subj of vouchers){
                //       console.log(subj)
                //       const ins = await ais.voucher.create({
                //           data: {
                //              serial: subj?.serial?.toString(), 
                //              pin: subj?.pin, 
                //              applicantName: subj?.applicant_name, 
                //              applicantPhone: subj?.applicant_phone?.toString()?.substring(0,10), 
                //              sellType: subj?.sell_type, 
                //              status: subj?.status == 1 ? true: false, 
                //              ... subj?.sold_at && ({ soldAt: moment(subj?.sold_at,'YYYY-MM-DD').toDate() }),
                //              ... subj.session_id && ({ admission: { connect: { id: subj.session_id?.toString() }}}),
                //              ... subj.group_id && ({ category: { connect: { id: subj?.group_id }}}),
                //              ... subj.vendor_id && ({ vendor: { connect: { id: subj?.vendor_id }}}),
                //           }
                //       })
                //       console.log(ins)
                //    }
                //  }
                //  if(sessions.length){  // SESSIONS
                //    for(const subj of sessions){
                //       console.log(subj)
                //       const ins = await ais.admission.create({
                //           data: {
                //              title: subj?.title, 
                //              voucherIndex: subj?.voucher_index, 
                //              applyPause: subj?.apply_freeze == 1 ? true: false, 
                //              showAdmitted: subj?.admission_show == 1 ? true: false, 
                //              status: subj?.status == 1 ? true: false, 
                //              ... subj?.exam_start && ({ examStart: moment(subj?.exam_start,'YYYY-MM-DD').toDate() }),
                //              ... subj?.exam_end && ({ examStart: moment(subj?.exam_end,'YYYY-MM-DD').toDate() }),
                //              ... subj?.apply_start && ({ applyStart: moment(subj?.apply_start,'YYYY-MM-DD').toDate() }),
                //              ... subj?.apply_end && ({ applyEnd: moment(subj?.apply_end,'YYYY-MM-DD').toDate() }),
                //              ... subj?.admission_date && ({ admittedAt: moment(subj?.admission_date,'YYYY-MM-DD').toDate() }),
                //              ... subj.pg_letter && ({ pgletter: { connect: { id: subj.pg_letter }}}),
                //              ... subj.ug_letter && ({ ugletter: { connect: { id: subj.ug_letter }}}),
                //              ... subj.dp_letter && ({ dpletter: { connect: { id: subj.dp_letter }}}),
                //              ... subj.cp_letter && ({ cpletter: { connect: { id: subj.cp_letter }}}),
                //            }
                //       })
                //       console.log(ins)
                //    }
                //  }
                //  if(letters.length){
                //    for(const subj of letters){ // LETTERS
                //       console.log(subj)
                //       const ins = await ais.admissionLetter.create({
                //           data: {
                //              title: subj?.title, 
                //              signatory: subj?.signatory, 
                //              signature: subj?.signature, 
                //              template: subj?.template, 
                //              ... subj.tag && ({ category: { connect: { id: subj.tag }}}),
                //              status: subj?.status == 1 ? true: false
                //           }
                //       })
                //       console.log(ins)
                //    }
                //  }
                if (vouchers) {
                    res.status(200).json(vouchers);
                }
                else {
                    res.status(202).json({ message: `no record found` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    runAccount(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let resp = [];
                const students = yield ais.student.findMany();
                // if(students.length){
                //   for(const student of students){
                //      const ins = await ais.user.create({
                //          data: {
                //             tag: student?.id,
                //             username: student?.id,
                //             password: sha1(student.fname?.toLowerCase()),
                //             unlockPin: '2024',
                //             locked: false,
                //             group: {
                //                connect: {
                //                   id: 1
                //                }
                //             },
                //          }
                //      })
                //      resp.push(ins)
                //   }
                // }
                // if(students){
                //   res.status(200).json(resp)
                // } else {
                //   res.status(202).json({ message: `no record found` })
                // }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
}
exports.default = AisController;
