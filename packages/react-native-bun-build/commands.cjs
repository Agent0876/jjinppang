const cli = require('./dist/commands.cjs');
module.exports = Array.isArray(cli) ? cli : cli.commands || cli.default || [];
