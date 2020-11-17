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
    logger.info("Hi");

    const ten: number = 10;
    const googleTopTenData = new GoogleTopTenData(logger);
    const googleTopTenImage = new GoogleTopTenImage(logger);

    const data:any = await googleTopTenData.getData(10);

    const imageList: any[] = [];

    for(let i: number = 0; i < ten; i++) {
        const fileName = __dirname +'/../top-ten-' + i + '.jpg';
        const item: any = await googleTopTenImage.saveImageStream(data[i], fileName);
        imageList[i] = item;

        // logger.info("Expires: " + imageList[i].expires);
    }

    for(let i: number = 0; i < ten; i++) {
        // const imageStream = imageList[0].stream;
        // logger.info("Expires: " + imageList[0].expires);

        // console.log("__dirname: " + __dirname);
        // const out = fs.createWriteStream(__dirname +'/../top-ten-' + i + '.png');

        // const finished = util.promisify(stream.finished);

        // imageStream.pipe(out);
        // tslint:disable-next-line:no-console
        // out.on('finish', () =>  logger.info('The PNG file ' + i + ' was created.\n'));

        // await finished(out);
    }    
}


run();

// app.get('/', function (req, res) {
//   res.send('Hello World!');
// });

// app.listen(3000, function () {
//   console.log('Example app listening on port 3000!');
// });