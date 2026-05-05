"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanProfanity = exports.containsProfanity = void 0;
const Filter = require('bad-words');
const filter = new Filter();
// Custom Turkish/English profane keywords (a very small subset for illustration, 
// usually you load this from a heavy JSON file)
const customBadWords = [
    'amk', 'aq', 'siktir', 'orospu', 'pic', 'piç', 'yavsak', 'yavşak', 'gavat', // TR examples
    'fuck', 'shit', 'bitch', 'asshole' // EN defaults are in bad-words but we can extend
];
filter.addWords(...customBadWords);
const containsProfanity = (text) => {
    return filter.isProfane(text);
};
exports.containsProfanity = containsProfanity;
const cleanProfanity = (text) => {
    return filter.clean(text);
};
exports.cleanProfanity = cleanProfanity;
//# sourceMappingURL=profanity.service.js.map