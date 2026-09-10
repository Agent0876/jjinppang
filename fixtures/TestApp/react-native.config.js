let commands;
try {
  commands = require('react-native-bun-build/commands');
} catch {
  commands = require('../../commands.js');
}

module.exports = {
  commands,
};
