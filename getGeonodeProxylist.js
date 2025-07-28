
const fs = require('fs');
const path = require('path');

async function fetchProxyData(page = 1) {
  const url = `https://proxylist.geonode.com/api/proxy-list?limit=500&page=${page}&sort_by=lastChecked&sort_type=desc`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error);
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
    console.log(`Fetched page ${page}, total items: ${allData.length}`);
    
    const totalPages = Math.ceil(response.total / response.limit);
    if (page >= totalPages) {
      break;
    }
    
    page++;
  }
  
  return allData;
}

function ensureOutputDir() {
  const outputDir = path.join(__dirname, 'output');
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
        const fileName = path.join(__dirname, 'output', `${protocolUpper}.txt`);
        
        if (!protocolFiles[protocolUpper]) {
          protocolFiles[protocolUpper] = [];
        }
        
        const proxyEntry = `${proxy.ip}:${proxy.port}`;
        protocolFiles[protocolUpper].push(proxyEntry);
      });
    }
  });
  
  Object.keys(protocolFiles).forEach(protocol => {
    const fileName = path.join(__dirname, 'output', `${protocol}.txt`);
    const content = protocolFiles[protocol].join('\n') + '\n';
    fs.appendFileSync(fileName, content);
    console.log(`Saved ${protocolFiles[protocol].length} ${protocol} proxies to ${fileName}`);
  });
}

async function main() {
  try {
    const allData = await getAllProxyData();
    
    fs.writeFileSync('getGeonodeProxylist.json', JSON.stringify(allData, null, 2));
    console.log(`Saved ${allData.length} total proxies to getGeonodeProxylist.json`);
    
    saveToProtocolFiles(allData);
    
    console.log('Process completed successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
