// tslint:disable: no-var-requires
import { strict } from 'assert';
// tslint:disable: no-console
// lib/app.ts
import fs = require('fs');
import meow = require('meow');
import stream = require('stream');
import { updateArrayBindingPattern } from 'typescript';
import util = require('util');
import  Data = require('./GoogleTopTenData');
import  Image = require('./GoogleTopTenImage');

// import  logger = require("./src/logger");
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

// Set up winston logging.
// tslint:disable-next-line: no-shadowed-variable
const logFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

let logger: any = {};

const cli = meow(`
Usage:
    $ googletopten --repeat  repeat-seconds-value  target-dir

Options:
    --debug, -l      - enables debug output

Examples:
  node app.js --debug C:/Users/user1/images/googleTopTen
`, {
  booleanDefault: undefined,
  flags: {
    debug: {
      type: 'boolean',
      default: false,
      alias: 'd',
    },
  },
});

// Create a new express application instance
async function update(imageDir) {
    logger.verbose("googleTopTen - app.ts: update()");

    const ten: number = 10;
    const googletoptendata: Data.googletoptendata = new Data.googletoptendata(logger);
    const googletoptenimage: Image.googletoptenimage = new Image.googletoptenimage(logger);

    const url = "https://www.google.com/trends/hottrends/atom/feed?pn=p1"; 
    logger.info(`Loading ${url}`);

    const data:any = await googletoptendata.getData(url, ten);
    logger.verbose("data: " + JSON.stringify(data, undefined, 2));

    const imageList: any[] = [];

    for(let i: number = 0; i < ten; i++) {
        const item: any = await googletoptenimage.saveImageStream(data[i]);
        imageList[i] = item;
    }

    try {
        logger.verbose(`Creating directory: ${imageDir}`);
        fs.mkdirSync(imageDir, { recursive: true })
    } catch (e) {
        logger.error(`Failure to create directory ${imageDir} - ${e}`)
    }

    try {
        for(let i: number = 0; i < ten; i++) {
            let filename = `${imageDir}/googleTopTen-${i}.${imageList[i].imageType}`
            logger.verbose(`Writing file: ${filename}`);
            fs.writeFileSync(filename, imageList[i].imageData.data); 
        } 
        logger.info(`${ten} images updated to ${imageDir}`)
    } catch (e) {
        logger.error(`Failure to save images ${imageDir} - ${e}`)
    }
}

async function main() {
    logger = createLogger({
        format: combine(
            label({ label: 'googleTopTen' }),
            format.colorize(),
            format.simple(),
            format.timestamp(),
            logFormat
        ),
        transports: [
            new transports.Console({timestamp: true}),
            // new transports.File({ filename: 'goolgeTopTen.log', timestamp: true })
        ]
    });
    
    logger.exitOnError = false;

    let imageDir = ".";
    if (cli.input[0] !== undefined) {
        imageDir = cli.input[0];
    }

    console.log("CLI: " + JSON.stringify(cli, undefined, 2));    

    let repeatInterval = 0;   
    
    if (cli.flags.debug)  {
        logger.level = "verbose";
    } else {
        logger.level = "info";
    }
    
    logger.verbose(`Working Directory: ${imageDir}`);
    logger.verbose('====================================');

    if (repeatInterval === 0) {   
        logger.verbose(`googletopten: Running once.`);  
        await update(imageDir);
    } else {
        logger.verbose(`googletopten: Starting update every ${repeatInterval} seconds.`);
        update(imageDir); // Do it once now.
        const updater = setInterval(update, repeatInterval * 1000);
    }
    logger.verbose("Done.");
}

main();