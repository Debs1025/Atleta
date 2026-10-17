/* eslint-env node */
/* global __dirname */
const fs = require('fs');
const path = require('path');

const svgDir = path.resolve(__dirname, '../node_modules/ionicons/dist/svg');
const targetFile = path.resolve(__dirname, '../node_modules/@expo/vector-icons/build/svgIconMap.js');
const createIconSetFile = path.resolve(__dirname, '../node_modules/@expo/vector-icons/build/createIconSet.js');

if (!fs.existsSync(svgDir)) {
  console.warn('[svg-icon-map] ionicons SVG directory not found.');
  process.exit(0);
}

const files = fs.readdirSync(svgDir).filter(f => f.endsWith('.svg'));
const map = {};

for (const file of files) {
  const name = file.replace(/\.svg$/, '');
  const xml = fs.readFileSync(path.join(svgDir, file), 'utf8')
    .replace(/<\?xml.*?\?>/g, '')
    .trim();
  map[name] = xml;
}

// Aliases for FontAwesome5 & MaterialCommunityIcons
const aliases = {
  'basketball-ball': 'basketball',
  'futbol': 'football',
  'baseball-ball': 'baseball',
  'tennisball': 'tennisball',
  'table-tennis': 'tennisball',
  'medal': 'medal',
  'dumbbell': 'fitness',
  'boxing-glove': 'fitness',
  'biking': 'bicycle',
  'running': 'walk',
  'run': 'walk',
  'swimmer': 'water',
  'waves': 'water',
  'volleyball': 'basketball',
  'volleyball-ball': 'basketball',
  'swap-horizontal': 'swap-horizontal',
  'swap-vertical': 'swap-vertical',
  'golf-ball': 'tennisball',
};

for (const [alias, src] of Object.entries(aliases)) {
  if (map[src]) {
    map[alias] = map[src];
  }
}

const jsContent = `module.exports = ${JSON.stringify(map)};\n`;
fs.writeFileSync(targetFile, jsContent, 'utf8');
console.log(`[svg-icon-map] Successfully generated svgIconMap.js with ${Object.keys(map).length} icons.`);

// Patch createIconSet.js to render SvgXml when available
if (fs.existsSync(createIconSetFile)) {
  let content = fs.readFileSync(createIconSetFile, 'utf8');
  if (!content.includes('svgIconMap')) {
    const importNeedle = "import { Text, } from 'react-native';";
    const importReplacement = `import { Text, } from 'react-native';\nimport { SvgXml } from 'react-native-svg';\nconst svgIconMap = require('./svgIconMap');`;

    content = content.replace(importNeedle, importReplacement);

    const renderNeedle = `        render() {
            if (__DEV__ && this.props.name && !(this.props.name in glyphMap)) {
                console.warn(\`"\${this.props.name}" is not a valid icon name for family "\${fontName}"\`);
            }
            if (!this.state.fontIsLoaded) {
                return <Text />;
            }
            return (<RNVIconComponent ref={(view) => {
                    this._icon = view;
                }} {...this.props}/>);
        }`;

    const renderReplacement = `        render() {
            const iconName = this.props.name;
            const size = this.props.size != null ? this.props.size : 24;
            const color = this.props.color != null ? this.props.color : '#FFFFFF';
            const xml = svgIconMap && iconName ? (svgIconMap[iconName] || svgIconMap[iconName.toLowerCase()] || svgIconMap[iconName.replace(/-outline$/, '')]) : null;

            if (xml) {
                return (
                    <SvgXml
                        xml={xml}
                        width={size}
                        height={size}
                        color={color}
                        fill={color}
                        style={this.props.style}
                    />
                );
            }

            if (__DEV__ && this.props.name && !(this.props.name in glyphMap)) {
                console.warn(\`"\${this.props.name}" is not a valid icon name for family "\${fontName}"\`);
            }
            if (!this.state.fontIsLoaded) {
                return <Text />;
            }
            return (<RNVIconComponent ref={(view) => {
                    this._icon = view;
                }} {...this.props}/>);
        }`;

    if (content.includes(renderNeedle)) {
      content = content.replace(renderNeedle, renderReplacement);
      fs.writeFileSync(createIconSetFile, content, 'utf8');
      console.log('[svg-icon-map] Successfully patched createIconSet.js to use SvgXml!');
    }
  }
}
