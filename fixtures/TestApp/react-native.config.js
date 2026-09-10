let commands;
try {
  commands = require('react-native-bun-build/commands');
} catch (e) {
  commands = require('../../commands.js');
}

module.exports = {
  commands,
};
