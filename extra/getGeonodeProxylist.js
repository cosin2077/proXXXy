
const fs = require('fs');
const path = require('path');

async function fetchProxyData(page = 1) {
  const url = `https://proxylist.geonode.com/api/proxy-list?limit=500&page=${ page }&sort_by=lastChecked&sort_type=desc`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching page ${ page }:`, error);
    return null;
  }
}

async function getAllProxyData() {
  const allData = [];
  let page = 1;

  console.log('Fetching proxy data...');

  while (true) {
    const response = await fetchProxyData(page);

    if (!response || !response.data || response.data.length === 0) {
      break;
    }

    allData.push(...response.data);
    console.log(`Fetched page ${ page }, total items: ${ allData.length }`);

    const totalPages = Math.ceil(response.total / response.limit);
    if (page >= totalPages) {
      break;
    }

    page++;
  }

  return allData;
}
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
function ensureOutputDir() {
  const outputDir = OUTPUT_DIR;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

function saveToProtocolFiles(data) {
  ensureOutputDir();

  const protocolFiles = {};

  data.forEach(proxy => {
    if (proxy.protocols && proxy.protocols.length > 0) {
      proxy.protocols.forEach(protocol => {
        const protocolUpper = protocol.toUpperCase();
        const fileName = path.join(__dirname, 'output', `${ protocolUpper }.txt`);

        if (!protocolFiles[protocolUpper]) {
          protocolFiles[protocolUpper] = [];
        }

        const proxyEntry = `${ proxy.ip }:${ proxy.port }`;
        protocolFiles[protocolUpper].push(proxyEntry);
      });
    }
  });

  Object.keys(protocolFiles).forEach(async protocol => {
    const fileName = path.join(OUTPUT_DIR, `${ protocol }.txt`);
    await ensureFile(fileName);
    const alreadyList = (await fs.promises.readFile(fileName, 'utf-8')).split(/\r?\n/).filter(Boolean)
    for (let content of protocolFiles[protocol]) {
      if (!alreadyList.includes(content)) {
        alreadyList.push(content)
      }
    }
    await fs.promises.writeFile(fileName, alreadyList.join('\n'))
    console.log(`Saved ${ protocolFiles[protocol].length } ${ protocol } proxies to ${ fileName }`);
  });
}
async function ensureFile(path) {
  const fs = require('fs').promises;
  const pathModule = require('path');

  try {
    await fs.access(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        const dir = pathModule.dirname(path);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path, '');
        return true;
      } catch (createError) {
        throw new Error(`Failed to create file ${ path }: ${ createError.message }`);
      }
    }
    throw new Error(`Failed to access file ${ path }: ${ error.message }`);
  }
}
async function main() {
  try {
    const allData = await getAllProxyData();

    fs.writeFileSync('getGeonodeProxylist.json', JSON.stringify(allData, null, 2));
    console.log(`Saved ${ allData.length } total proxies to getGeonodeProxylist.json`);

    saveToProtocolFiles(allData);

    console.log('Process completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
