"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = __importDefault(require("../controller/authController"));
class AuthRoute {
    constructor() {
        this.router = (0, express_1.Router)();
        this.controller = new authController_1.default();
        this.initializeRoute();
    }
    initializeRoute() {
        /* Authentication Providers */
        this.router.post('/credential', this.controller.authenticateWithCredential);
        this.router.post('/google', this.controller.authenticateWithGoogle);
        /* Account Management - Change Password */
        this.router.post('/password', this.controller.changePassword);
        /* Photo Management */
        this.router.get('/pixo', this.controller.fetchEvsPhoto);
        this.router.get('/photos', this.controller.fetchPhoto);
        this.router.post('/photos', this.controller.postPhoto);
        this.router.post('/photos/rotate', this.controller.rotatePhoto);
        this.router.delete('/photos/:id', this.controller.removePhoto);
        /* SSO Pin Management */
        this.router.post('/pins/generate', this.controller.resetStudentPins);
        this.router.post('/pins/generate/:tag', this.controller.resetStudentPin);
        this.router.get('/pins/send', this.controller.sendStudentPins);
        this.router.get('/pins/send/:tag', this.controller.sendStudentPin);
    }
}
exports.default = new AuthRoute().router;
