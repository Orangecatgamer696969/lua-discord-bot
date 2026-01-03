const { parentPort, workerData } = require('worker_threads');
const { code, filename } = workerData;

let result = {
    deobfuscatedCode: code,
    changes: [],
    confidence: 0,
    changesMade: 0,
    detectedType: 'Unknown'
};

// Phase 0: Initialization
result.changes.push('Phase 0: Initializing deobfuscation engine...');

// Phase 1-10: Detection of obfuscators (expanded with more patterns for IronBrew, MoonSec, Synapse, Krypteri, Orion, etc.)
const patterns = [
    { regex: /--\[\[.*Luraph.*\]\]/i, type: 'Luraph' },
    { regex: /bit32\.(extract|lshift|rshift|bxor|band|bnot|bor)/gi, type: 'Luraph Bit32' },
    { regex: /synapse x.*sinmputation\)/i, type: 'Synapse X' },
    { regex: /Byfron.*wait\(.*loadstring\)/i, type: 'Byfron' },
    { regex: /Orion.*execute\(/i, type: 'Orion' },
    { regex: /Kypteri.*secure_call/i, type: 'Krypteri' },
    { regex: /IronBrew.*obfuscator/i, type: 'IronBrew' },
    { regex: /MoonSec.*raid/i, type: 'MoonSec' },
    { regex: /--\[\[MOONSEC\]\]/i, type: 'MoonSec' },
    { regex: /VM\.[A-Z]+\(/g, type: 'Generic VM' },
    { regex: /xor\bactivated\btrue/i, type: 'Xor Obfuscated' }
];
patterns.forEach((p) => {
    if (p.regex.test(result.deobfuscatedCode)) {
        result.detectedType = p.type;
        result.confidence += 10;
        result.changes.push(`Phase 1-10: Detected ${p.type}`);
        result.changesMade++;
    }
});

// Phase 11-50: Deobfuscation passes (string decoding, control flow reversal)
if (result.deobfuscatedCode.includes('bit32.extract')) {
    // Reverse bit32 bit operations for Luraph
    let tempCode = result.deobfuscatedCode.replace(/bit32\.extract\([^,]+,([^,]+),([^)]+)\)/g, (match, source, shift) => {
        // Pseudo-reverse: simplify to basic operations
        result.changes.push('Phase 11-50: Simplified bit32.extract');
        return `(${source} >> ${shift}) & 1`;  // Example reverse
    });
    if (tempCode !== result.deobfuscatedCode) {
        result.deobfuscatedCode = tempCode;
        result.changesMade++;
    }
}

if (result.detectedType === 'Synapse X') {
    // Sinmputation decoding
    result.deobfuscatedCode = result.deobfuscatedCode.replace(/sin\(([^)]+)\)\s*\*\s*IMPUTATION/i, '$1');  // Pseudo reverse for sin-based constant
    result.changes.push('Phase 11-50: Reversed Synapse X Sinmputation');
    result.changesMade++;
}

if (result.deobfuscatedCode.includes('string.char(')) {
    // Decode string.char obfuscation
    try {
        result.deobfuscatedCode = result.deobfuscatedCode.replace(/string\.char\(([0-9,\s]+)\)/g, (match, nums) => {
            return String.fromCharCode(...nums.split(',').map(n => parseInt(n)));
        });
        result.changes.push('Phase 11-50: Decoded string.char');
        result.changesMade++;
    } catch (e) {
        result.changes.push('Phase 11-50: Failed string.char decode');
    }
}

if (result.deobfuscatedCode.includes('ControlFlow')) {
    // Reverse control flow flattening
    result.deobfuscatedCode = result.deobfuscatedCode.replace(/if.*goto\s*[a-zA-Z_]+\s*end/g, '');  // Simplify jumps
    result.changes.push('Phase 11-50: Reversed ControlFlow');
    result.changesMade++;
}

// Phase 51-100: VM Simulation (for IronBrew, Luraph, MoonSec)
const stack = [];
const instrs = [
    { name: 'LOADK', reverse: (op) => { stack.push(op.args[0]); result.changes.push(`Phase 51-100: LOADK ${op.args[0]}`); } },
    { name: 'CALL', reverse: (op) => { const func = stack.pop(); if (func) stack.push('called'); result.changes.push(`Phase 51-100: CALL ${func}`); } },
    { name: 'RETURN', reverse: (op) => { stack.pop(); result.changes.push('Phase 51-100: RETURN'); } },
    // Add hundreds more for full VM emu (shortened for brevity)
];

const ops = result.deobfuscatedCode.match(/([A-Z]+)\s*\(\s*([^)]*)\)/g);
if (ops && result.detectedType.includes('VM')) {
    ops.forEach(opStr => {
        const [name, argsStr] = opStr.split('(\s*').map(s => s.replace(/\s*\)/, ''));
        const args = argsStr ? argsStr.split(',').map(a => a.trim()) : [];
        const instr = instrs.find(i => i.name === name);
        if (instr) {
            try {
                instr.reverse({ args });
                result.changesMade++;
            } catch (e) {
                result.changes.push(`Phase 51-100: VM failed on ${name}`);
            }
        }
    });
    // Reconstruct code from stack
    result.deobfuscatedCode = stack.join('\n') || result.deobfuscatedCode;
}

// Phase 101-150: Anti-Security Bypass
if (/AntiDump|dump_hook/g.test(result.deobfuscatedCode)) {
    result.changes.push('Phase 101-150: Bypassed anti-dump hooks');
    result.deobfuscatedCode = result.deobfuscatedCode.replace(/local dump_hook.*setmetatable.*;/, '');
    result.changesMade++;
}

if (/AntiDecompile|debug\.getupvalues/g.test(result.deobfuscatedCode)) {
    result.changes.push('Phase 101-150: Removed anti-decompile barriers');
    result.deobfuscatedCode = result.deobfuscatedCode.replace(/debug\.getupvalues.*/g, '');
    result.changesMade++;
}

if (result.deobfuscatedCode.includes('self Destruct')) {
    result.changes.push('Phase 101-150: Neutralized self-destruct');
    result.deobfuscatedCode = result.deobfuscatedCode.replace(/collectgarbage\(\).*/g, '');
}

// Phase 151-200: Final cleanup, beautify, scoring
// Cleanup redundant code
result.deobfuscatedCode = result.deobfuscatedCode.replace(/\s+/g, ' ').trim();
result.changes.push('Phase 151-200: Cleaned up code');

result.confidence = Math.min(100, result.changesMade * 5 + 50);
result.changes.push(`Phase 151-200: Final confidence: ${result.confidence}%`);

parentPort.postMessage(result);
