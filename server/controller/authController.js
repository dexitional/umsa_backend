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
const authModel_1 = __importDefault(require("../model/authModel"));
const ums_1 = require("../prisma/client/ums");
const helper_1 = require("../util/helper");
const sso = new ums_1.PrismaClient();
//import { customAlphabet } from 'nanoid'
const jwt = require('jsonwebtoken');
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwzyx", 8);
const pin = customAlphabet("1234567890", 4);
const sha1 = require('sha1');
const path = require('path');
const fs = require("fs");
const sms = require("../config/sms");
const Auth = new authModel_1.default();
class AuthController {
    authenticateWithCredential(req, res) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { username, password } = req.body;
                if (!username)
                    throw new Error('No username provided!');
                if (!password)
                    throw new Error('No password provided!');
                // Locate Single-Sign-On Record or Student account
                //const isUser = await Auth.withCredential(username, password);
                const isUser = yield sso.user.findFirst({ where: { username, OR: [{ password: sha1(password) }, { unlockPin: password }] }, include: { group: { select: { title: true } } } });
                const isApplicant = yield sso.voucher.findFirst({ where: { serial: username, pin: password }, include: { admission: true } });
                if (isUser) {
                    let { id, tag, groupId, group: { title: groupName } } = isUser;
                    let user = {};
                    if (groupId == 4) { // Support
                        const data = yield sso.support.findUnique({ where: { supportNo: Number(tag) } });
                        if (data)
                            user = { tag, fname: data === null || data === void 0 ? void 0 : data.fname, mname: data === null || data === void 0 ? void 0 : data.mname, lname: data === null || data === void 0 ? void 0 : data.lname, mail: data === null || data === void 0 ? void 0 : data.email, descriptor: "IT Support", department: "System Support", group_id: groupId, group_name: groupName };
                    }
                    else if (groupId == 2) { // Staff
                        const data = yield sso.staff.findUnique({ where: { staffNo: tag }, include: { promotion: { select: { job: true } }, job: true, unit: true }, });
                        if (data)
                            user = { tag, fname: data === null || data === void 0 ? void 0 : data.fname, mname: data === null || data === void 0 ? void 0 : data.mname, lname: data === null || data === void 0 ? void 0 : data.lname, mail: data === null || data === void 0 ? void 0 : data.email, descriptor: (_a = data === null || data === void 0 ? void 0 : data.job) === null || _a === void 0 ? void 0 : _a.title, department: (_b = data === null || data === void 0 ? void 0 : data.unit) === null || _b === void 0 ? void 0 : _b.title, group_id: groupId, group_name: groupName };
                    }
                    else { // Student
                        const data = yield sso.student.findUnique({ where: { id: tag }, include: { program: { select: { longName: true } } } });
                        if (data)
                            user = { tag, fname: data === null || data === void 0 ? void 0 : data.fname, mname: data === null || data === void 0 ? void 0 : data.mname, lname: data === null || data === void 0 ? void 0 : data.lname, mail: data === null || data === void 0 ? void 0 : data.email, descriptor: (_c = data === null || data === void 0 ? void 0 : data.program) === null || _c === void 0 ? void 0 : _c.longName, department: "", group_id: groupId, group_name: groupName };
                    }
                    // SSO Photo
                    const photo = `${process.env.UMS_DOMAIN}/auth/photos/?tag=${encodeURIComponent(tag)}`;
                    // Roles & Privileges
                    const roles = yield sso.userRole.findMany({ where: { userId: id }, include: { appRole: { select: { title: true, app: true } } } });
                    const evsRoles = yield sso.election.findMany({
                        where: {
                            status: true,
                            OR: [
                                { voterData: { path: '$[*].tag', array_contains: tag } },
                                { admins: { path: '$[*]', array_contains: tag } },
                            ]
                        },
                        select: { id: true, title: true, admins: true }
                    });
                    //console.log(user,roles,evsRoles)
                    // Construct UserData
                    //let userdata;
                    let userdata = { user, roles: [], photo };
                    if (roles === null || roles === void 0 ? void 0 : roles.length)
                        userdata.roles = [...userdata.roles, ...roles];
                    if (evsRoles === null || evsRoles === void 0 ? void 0 : evsRoles.length)
                        userdata.roles = [
                            ...userdata.roles,
                            ...(evsRoles === null || evsRoles === void 0 ? void 0 : evsRoles.map((r) => ({
                                id: r.id,
                                isAdmin: !!(r.admins.find((m) => m.toLowerCase() == tag.toLowerCase())),
                                appRole: {
                                    app: { tag: 'evs', title: r.title }
                                }
                            })))
                        ];
                    console.log(userdata);
                    // Generate Session Token & 
                    const token = jwt.sign(userdata || {}, process.env.SECRET, { expiresIn: 60 * 60 });
                    // Send Response to Client
                    return res.status(200).json({ success: true, data: userdata, token });
                }
                else if (isApplicant) {
                    const data = yield sso.stepProfile.findFirst({ where: { serial: username }, include: { applicant: { select: { photo: true } } } });
                    let user;
                    if (data) {
                        user = { tag: username, fname: data === null || data === void 0 ? void 0 : data.fname, mname: data === null || data === void 0 ? void 0 : data.mname, lname: data.lname, mail: data.email, descriptor: "Applicant", department: "None", group_id: 3, group_name: "Applicant" };
                    }
                    else {
                        user = { tag: username, fname: "Admission", mname: "", lname: "Applicant", mail: "", descriptor: "Applicant", department: "None", group_id: 3, group_name: "Applicant" };
                    }
                    const photo = data ? (_d = data === null || data === void 0 ? void 0 : data.applicant) === null || _d === void 0 ? void 0 : _d.photo : `https://cdn.ucc.edu.gh/photos/?tag=${encodeURIComponent(username)}`;
                    // Construct UserData
                    const userdata = {
                        user,
                        roles: [],
                        photo
                    };
                    // Generate Session Token & 
                    const token = jwt.sign(userdata || {}, process.env.SECRET, { expiresIn: 60 * 60 });
                    // Send Response to Client
                    return res.status(200).json({ success: true, data: userdata, token });
                }
                else {
                    return res.status(401).json({ success: false, message: "Invalid Credentials!" });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(401).json({ success: false, message: error.message });
            }
        });
    }
    authenticateWithGoogle(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { providerId, email } = req.body;
            console.log(req.body);
            try {
                if (!email)
                    throw new Error('No identity Email provided!');
                // Get University User Record and Category
                var user = yield Auth.fetchUserByVerb(email);
                if (user) {
                    // Locate Single-Sign-On Record
                    const isUser = yield Auth.fetchSSOUser(user.tag);
                    if (isUser) {
                        const photo = `https://cdn.ucc.edu.gh/photos/?tag=${encodeURIComponent(user === null || user === void 0 ? void 0 : user.tag)}`;
                        const { uid, group_id: gid } = isUser;
                        let roles = uid ? yield Auth.fetchRoles(uid) : []; // All App Roles
                        let evsRoles = yield Auth.fetchEvsRoles(user.tag); // Only Electa Roles
                        // Construct UserData
                        const userdata = {
                            user: { tag: user.tag, fname: user.fname, mname: user.mname, lname: user.lname, mail: user.username, descriptor: user.descriptor, department: user.unitname, group_id: gid, group_name: user.group_name },
                            roles: [...roles, ...evsRoles],
                            photo
                        };
                        // Generate Session Token & 
                        const token = jwt.sign(userdata || {}, process.env.SECRET, { expiresIn: 60 * 60 });
                        // Send Response to Client
                        res.status(200).json({ success: true, data: userdata, token });
                    }
                    else {
                        const pwd = nanoid();
                        const photo = `https://cdn.ucc.edu.gh/photos/?tag=${encodeURIComponent(user === null || user === void 0 ? void 0 : user.tag)}`;
                        // Create Single-Sign-On Account or Record
                        const ins = yield Auth.insertSSOUser({
                            username: email,
                            password: sha1(pwd),
                            group_id: user.gid,
                            tag: user.tag,
                        });
                        if (ins === null || ins === void 0 ? void 0 : ins.insertId) {
                            const uid = ins.insertId;
                            let evsRoles = yield Auth.fetchEvsRoles(user.tag); // EVS Roles
                            // Construct UserData
                            const userdata = {
                                user: { tag: user.tag, fname: user.fname, mname: user.mname, lname: user.lname, mail: user.username, descriptor: user.descriptor, department: user.unitname, group_id: user.gid, group_name: user.group_name },
                                roles: [...evsRoles],
                                photo
                            };
                            // Generate Session Token & 
                            const token = jwt.sign(userdata || {}, process.env.SECRET, { expiresIn: 60 * 60 });
                            // Send Response to Client
                            res.status(200).json({ success: true, data: userdata, token });
                        }
                        else {
                            res.status(500).json({
                                success: false,
                                message: "Account not Staged!",
                            });
                        }
                    }
                }
                else {
                    res.status(401).json({
                        success: false,
                        message: "Invalid email account!",
                    });
                }
            }
            catch (e) {
                console.log(e);
                res.status(401).json({ success: false, message: e.message });
            }
        });
    }
    authenticateWithKey(req, res) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    /* Account & Password */
    changePassword(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { oldpassword, newpassword, tag } = req.body;
                const isUser = yield sso.user.findFirst({
                    where: {
                        username: tag,
                        password: sha1(oldpassword),
                    }
                });
                if (isUser) {
                    const ups = yield sso.user.updateMany({
                        where: { tag },
                        data: { password: sha1(newpassword), unlockPin: newpassword }
                    });
                    res.status(200).json(ups);
                }
                else {
                    res.status(202).json({ message: `Wrong password provided!` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* SSO Management */
    /* Send Student Pin */
    sendStudentPin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { tag } = req.params;
                const user = yield sso.user.findFirst({ where: { groupId: 1, status: true, tag } });
                if (user) {
                    const st = yield sso.student.findUnique({ where: { id: tag } });
                    const msg = `Please Access https://ums.aucc.edu.gh with USERNAME: ${user.username}, PIN: ${user.unlockPin}. Note that you can use 4-digit PIN as PASSWORD`;
                    let resp;
                    if (st && (st === null || st === void 0 ? void 0 : st.phone)) {
                        resp = yield sms(st === null || st === void 0 ? void 0 : st.phone, msg);
                    }
                    else {
                        resp = { code: 1002 };
                    }
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `Invalid request!` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Send Voter Pins */
    sendVoterPins(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const en = yield sso.election.findFirst({ where: { id: Number(id), status: true } });
                if (en) {
                    const users = en === null || en === void 0 ? void 0 : en.voterData;
                    if (users === null || users === void 0 ? void 0 : users.length) {
                        const resp = yield Promise.all(users === null || users === void 0 ? void 0 : users.map((row) => __awaiter(this, void 0, void 0, function* () {
                            const msg = `Please Access https://ums.aucc.edu.gh with USERNAME: ${row.username}, PIN: ${row.pin}. Note that you can use 4-digit PIN as PASSWORD`;
                            if (row === null || row === void 0 ? void 0 : row.phone)
                                return yield sms(row === null || row === void 0 ? void 0 : row.phone, msg);
                            return { code: 1002 };
                        })));
                        return res.status(200).json(resp);
                    }
                    else {
                        return res.status(202).json({ message: `Invalid request!` });
                    }
                }
                return res.status(202).json({ message: `Invalid request!` });
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Send Student Pins */
    sendStudentPins(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const users = yield sso.user.findMany({ where: { groupId: 1, status: true } });
                if (users === null || users === void 0 ? void 0 : users.length) {
                    const resp = yield Promise.all(users === null || users === void 0 ? void 0 : users.map((row) => __awaiter(this, void 0, void 0, function* () {
                        const st = yield sso.student.findUnique({ where: { id: row === null || row === void 0 ? void 0 : row.tag } });
                        const msg = `Please Access https://ums.aucc.edu.gh with USERNAME: ${row.username}, PIN: ${row.unlockPin}. Note that you can use 4-digit PIN as PASSWORD`;
                        if (st && (st === null || st === void 0 ? void 0 : st.phone))
                            return yield sms(st.phone, msg);
                        return { code: 1002 };
                    })));
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `Invalid request!` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Reset Student Pins  */
    resetStudentPins(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const users = yield sso.user.findMany({
                    where: { groupId: 1, status: true }
                });
                if (users === null || users === void 0 ? void 0 : users.length) {
                    const resp = yield Promise.all(users === null || users === void 0 ? void 0 : users.map((row) => __awaiter(this, void 0, void 0, function* () {
                        return yield sso.user.update({
                            where: { id: row === null || row === void 0 ? void 0 : row.id },
                            data: { unlockPin: pin() }
                        });
                    })));
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `Invalid request!` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Reset Student Pins  */
    resetStudentPin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { tag } = req.params;
                const user = yield sso.user.findFirst({ where: { groupId: 1, status: true, tag } });
                if (user) {
                    const resp = yield sso.user.updateMany({
                        where: { tag },
                        data: { unlockPin: pin() }
                    });
                    res.status(200).json(resp);
                }
                else {
                    res.status(202).json({ message: `Invalid request!` });
                }
            }
            catch (error) {
                console.log(error);
                return res.status(500).json({ message: error.message });
            }
        });
    }
    /* Photo Management */
    // async fetchPhoto(req: Request,res: Response) {
    //   try {
    //       res.setHeader("Access-Control-Allow-Origin", "*");
    //       let mtag:any = req?.query?.tag;
    //           mtag = mtag.trim().toLowerCase();
    //       const isUser = await sso.user.findFirst({ where: { tag: mtag }}); // Biodata
    //       console.log(mtag,isUser)
    //       if (isUser) {
    //           let { groupId } = isUser, spath;
    //           const tag = mtag.replaceAll("/", "").replaceAll("_", "");
    //           if(groupId == 4)       spath = path.join(__dirname, "/../../public/cdn/photo/support/");
    //           else if(groupId == 3)  spath = path.join(__dirname, "/../../public/cdn/photo/applicant/");
    //           else if(groupId == 2)  spath = path.join(__dirname, "/../../public/cdn/photo/staff/");
    //           else if(groupId == 1)  spath = path.join(__dirname, "/../../public/cdn/photo/student/");
    //           else spath = path.join(__dirname, "/../../public/cdn/");
    //           const file = `${spath}${tag}.jpg`;
    //           const file2 = `${spath}${tag}.jpeg`;
    //           console.log("TEST:  ",file)
    //           try {
    //             if(fs.statSync(file)) return res.status(200).sendFile(file);
    //             else if(fs.statSync(file2)) return res.status(200).sendFile(file2);
    //             else return res.status(200).sendFile(`${spath}/none.png`);
    //           } catch (e) {
    //             return res.status(200).sendFile(path.join(__dirname, "/../../public/cdn/")+`/none.png`);
    //           }
    //       } else {
    //           res.status(200).sendFile(path.join(__dirname, "/../../public/cdn", "none.png"));
    //       }
    //   } catch(err) {
    //       console.log(err)
    //       res.status(200).sendFile(path.join(__dirname, "/../../public/cdn", "none.png"));
    //   }
    // }
    fetchEvsPhoto(req, res) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Cross-Origin-Opener-Policy", "cross-origin");
                res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
                res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
                let eid = (_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.eid;
                let mtag = (_b = req === null || req === void 0 ? void 0 : req.query) === null || _b === void 0 ? void 0 : _b.tag;
                mtag = (_c = mtag === null || mtag === void 0 ? void 0 : mtag.trim()) === null || _c === void 0 ? void 0 : _c.toLowerCase();
                const tag = (_d = mtag === null || mtag === void 0 ? void 0 : mtag.replaceAll("/", "")) === null || _d === void 0 ? void 0 : _d.replaceAll("_", "");
                if (!mtag && fs.statSync(path.join(__dirname, `/../../public/cdn/photo/evs`, `${eid}.png`)))
                    res.status(200).sendFile(path.join(__dirname, `/../../public/cdn/photo/evs`, `${eid}.png`));
                else if (fs.statSync(path.join(__dirname, `/../../public/cdn/photo/evs/${eid}`, `${tag}.jpg`)))
                    res.status(200).sendFile(path.join(__dirname, `/../../public/cdn/photo/evs/${eid}`, `${tag}.jpg`));
                else
                    res.status(200).sendFile(path.join(__dirname, "/../../public/cdn/") + `/none.png`);
            }
            catch (err) {
                console.log(err);
                res.status(200).sendFile(path.join(__dirname, "/../../public/cdn", "none.png"));
            }
        });
    }
    fetchPhoto(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Cross-Origin-Opener-Policy", "cross-origin");
                res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
                res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
                let mtag = (_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.tag;
                mtag = mtag.trim().toLowerCase();
                const tag = mtag.replaceAll("/", "").replaceAll("_", "");
                if (fs.statSync(path.join(__dirname, "/../../public/cdn/photo/staff/", `${tag}.jpg`)))
                    res.status(200).sendFile(path.join(__dirname, "/../../public/cdn/photo/staff/", `${tag}.jpg`));
                else if (fs.statSync(path.join(__dirname, "/../../public/cdn/photo/student/", `${tag}.jpg`)))
                    res.status(200).sendFile(path.join(__dirname, "/../../public/cdn/photo/student/", `${tag}.jpg`));
                else if (fs.statSync(path.join(__dirname, "/../../public/cdn/photo/support/", `${tag}.jpg`)))
                    res.status(200).sendFile(path.join(__dirname, "/../../public/cdn/photo/support/", `${tag}.jpg`));
                else if (fs.statSync(path.join(__dirname, "/../../public/cdn/photo/applicant/", `${tag}.jpg`)))
                    res.status(200).sendFile(path.join(__dirname, "/../../public/cdn/photo/applicant/", `${tag}.jpg`));
                else
                    res.status(200).sendFile(path.join(__dirname, "/../../public/cdn/") + `/none.png`);
            }
            catch (err) {
                console.log(err);
                res.status(200).sendFile(path.join(__dirname, "/../../public/cdn", "none.png"));
            }
        });
    }
    postPhoto(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).send('No files were uploaded.');
            }
            const photo = req.files.photo;
            const { tag } = req.body;
            const isUser = yield sso.user.findFirst({ where: { tag } });
            if (!isUser) {
                const stphoto = `${req.protocol}://${req.get("host")}/api/auth/photos/?tag=${tag.toString().toLowerCase()}&cache=${Math.random() * 1000}`;
                return res.status(200).json({ success: true, data: stphoto });
            }
            let { groupId } = isUser;
            var mpath;
            switch (groupId) {
                case 1:
                    mpath = "student";
                    break;
                case 2:
                    mpath = "staff";
                    break;
                case 3:
                    mpath = "applicant";
                    break;
                case 4:
                    mpath = "support";
                    break;
                default:
                    mpath = "student";
                    break;
            }
            const dest = path.join(__dirname, "/../../public/cdn/photo/" + mpath, (tag && tag.toString().replaceAll("/", "").trim().toLowerCase()) + ".jpg");
            photo.mv(dest, function (err) {
                if (err)
                    return res.status(500).send(err);
                const stphoto = `${req.protocol}://${req.get("host")}/api/auth/photos/?tag=${tag.toString().toLowerCase()}&cache=${Math.random() * 1000}`;
                return res.status(200).json({ success: true, data: stphoto });
            });
        });
    }
    //   async sendPhotos(req: Request,res: Response) {
    //     var { gid } = req.body;
    //     var spath = path.join(__dirname,"/../../public/cdn/photo/"), mpath;
    //     if (req.files && req.files.photos.length > 0) {
    //       for (var file of req.files.photos) {
    //         switch (parseInt(gid)) {
    //           case 1:
    //             mpath = `${spath}/student/`;
    //             break;
    //           case 2:
    //             mpath = `${spath}/staff/`;
    //             break;
    //           case 3:
    //             mpath = `${spath}/nss/`;
    //             break;
    //           case 4:
    //             mpath = `${spath}/applicant/`;
    //             break;
    //           case 5:
    //             mpath = `${spath}/alumni/`;
    //             break;
    //           case 6:
    //             mpath = `${spath}/code/`;
    //             break;
    //         }
    //         let tag = file.name.toString().split(".")[0].replaceAll("/", "").trim().toLowerCase();
    //             tag = `${mpath}${tag}.jpg`;
    //         file.mv(tag, (err) => {
    //           if (!err) count = count + 1;
    //         });
    //       }
    //       res.status(200).json({ success: true, data: null });
    //     }
    //   }
    rotatePhoto(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let { studentId: tag } = req.body;
            var spath = path.join(__dirname, "/../../public/cdn/photo/");
            const isUser = yield sso.user.findFirst({ where: { tag } });
            let { groupId } = isUser;
            switch (parseInt(groupId)) {
                case 1:
                    spath = `${spath}/student/`;
                    break;
                case 2:
                    spath = `${spath}/staff/`;
                    break;
                case 3:
                    spath = `${spath}/applicant/`;
                    break;
                case 4:
                    spath = `${spath}/support/`;
                    break;
            }
            tag = tag.toString().replaceAll("/", "").trim().toLowerCase();
            const file = `${spath}${tag}.jpg`;
            const file2 = `${spath}${tag}.jpeg`;
            var stats = fs.statSync(file);
            var stats2 = fs.statSync(file2);
            if (stats) {
                yield (0, helper_1.rotateImage)(file);
                const stphoto = `${req.protocol}://${req.get("host")}/api/photos/?tag=${tag.toString().toLowerCase()}&cache=${Math.random() * 1000}`;
                res.status(200).json({ success: true, data: stphoto });
            }
            else if (stats2) {
                yield (0, helper_1.rotateImage)(file2);
                const stphoto = `${req.protocol}://${req.get("host")}/api/photos/?tag=${tag.toString().toLowerCase()}&cache=${Math.random() * 1000}`;
                res.status(200).json({ success: true, data: stphoto });
            }
            else {
                res.status(200).json({ success: false, data: null, msg: "Photo Not Found!" });
            }
        });
    }
    removePhoto(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let tag = req.params.id;
            const isUser = yield sso.user.findFirst({ where: { tag } });
            let { groupId } = isUser;
            var spath = path.join(__dirname, "/../../public/cdn/photo");
            switch (parseInt(groupId)) {
                case 1:
                    spath = `${spath}/student/`;
                    break;
                case 2:
                    spath = `${spath}/staff/`;
                    break;
                case 3:
                    spath = `${spath}/applicant/`;
                    break;
                case 4:
                    spath = `${spath}/support/`;
                    break;
            }
            tag = tag.toString().replaceAll("/", "").replaceAll("_", "").trim().toLowerCase();
            const file = `${spath}${tag}.jpg`;
            var stats = fs.statSync(file);
            if (stats) {
                fs.unlinkSync(file);
                const stphoto = `${req.protocol}://${req.get("host")}/api/photos/?tag=${tag.toString().toLowerCase()}&cache=${Math.random() * 1000}`;
                res.status(200).json({ success: true, data: stphoto });
            }
            else {
                res.status(200).json({ success: false, data: null, msg: "Photo Not Found!" });
            }
        });
    }
}
exports.default = AuthController;
