"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv = __importStar(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const search_service_1 = require("./services/search.service");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const note_routes_1 = __importDefault(require("./routes/note.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const favorite_routes_1 = __importDefault(require("./routes/favorite.routes"));
dotenv.config();
console.log("DB URL:", process.env.DATABASE_URL); // ← ekle
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.post('/test', (req, res) => {
    console.log('BODY:', req.body);
    res.json({ ok: true });
});
app.use(express_1.default.urlencoded({ extended: true }));
// Serve uploaded mock files
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../uploads')));
// Apply rate limiter to /api
// app.use('/api/', rateLimitMiddleware);
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/notes', note_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/favorites', favorite_routes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});
const PORT = process.env.PORT || 4000;
app.use((err, req, res, next) => {
    console.error("🔴 GLOBAL ERROR:", err);
    res.status(500).json({ message: err.message, stack: err.stack });
});
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    try {
        await (0, search_service_1.initElasticSearch)();
    }
    catch (e) {
        console.error('ElasticSearch init failed:', e);
    }
});
//# sourceMappingURL=app.js.map