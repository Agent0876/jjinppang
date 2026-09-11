import { describe, expect, it } from 'bun:test';
import { withJjinppang } from '../packages/core/src/expo/index.js';

describe('Expo and Metro Config Adapter (withJjinppang)', () => {
  it('augments base Metro / Expo configuration with jjinppang resolvers and platforms', () => {
    const baseConfig = {
      resolver: {
        sourceExts: ['js', 'json', 'ts', 'tsx'],
        assetExts: ['png', 'jpg'],
      },
    };

    const augmented = withJjinppang(baseConfig, {
      assetExtensions: ['custom-ext'],
      alias: {
        '@components': './src/components',
      },
      minify: true,
    });

    expect(augmented.resolver.assetExts).toContain('custom-ext');
    expect(augmented.resolver.assetExts).toContain('png');
    expect(augmented.resolver.platforms).toContain('ios');
    expect(augmented.resolver.platforms).toContain('android');
    expect(augmented.resolver.platforms).toContain('macos');
    expect(augmented.resolver.platforms).toContain('windows');
    expect(augmented.resolver.extraNodeModules['@components']).toBe('./src/components');
    expect(augmented.jjinppang.enabled).toBe(true);
    expect(augmented.jjinppang.minify).toBe(true);
  });

  it('handles empty config gracefully', () => {
    const augmented = withJjinppang({});
    expect(augmented.resolver).toBeDefined();
    expect(augmented.resolver.platforms).toContain('ios');
    expect(augmented.jjinppang.enabled).toBe(true);
  });
});
