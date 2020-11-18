// lib/app.ts
import fs = require('fs');
import stream = require('stream');
import util = require('util');



// tslint:disable: no-var-requires
// tslint:disable: no-console
const logger = require("../src//logger");
logger.setLevel("verbose");

const GoogleTopTenData = require('../src/googletoptendata');
const GoogleTopTenImage = require('../src/GoogleTopTenImage');

// Create a new express application instance
async function run() {
    logger.info("googleTopTen - app.ts");

    const ten: number = 10;
    const googleTopTenData = new GoogleTopTenData(logger);
    const googleTopTenImage = new GoogleTopTenImage(logger);

    const data:any = await googleTopTenData.getData(10);

    const imageList: any[] = [];

    for(let i: number = 0; i < ten; i++) {
        // const fileName = __dirname +'/../top-ten-' + i + '.jpg';
        const item: any = await googleTopTenImage.saveImageStream(data[i]);
        imageList[i] = item;

        // logger.info("Expires: " + imageList[i].expires);
    }

    logger.info("Data gathered.");

    for(let i: number = 0; i < ten; i++) {
        fs.writeFileSync(__dirname +'/../top-ten-' + i + "." + imageList[i].imageType, imageList[i].imageData.data); 
    } 
}

run();