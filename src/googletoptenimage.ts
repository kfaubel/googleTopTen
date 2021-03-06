import { doesNotReject } from "assert";

// tslint:disable: no-var-requires
// tslint:disable: object-literal-sort-keys
const fs = require('fs');
const axios = require('axios'); 
// const {Readable} = require('stream');
const jpeg = require('jpeg-js');

// const { createCanvas, loadImage } = require('canvas');
// const GoogleTopTenData = require('././googletoptendata');
const pure = require('pureimage');
// const pureTextPath = require('pureimage/src/text.js');
// const pureregisterFont = require('pureimage/src/text.js');

export class googletoptenimage {
    // private googleTopTenData: any;
    // private dayList: any[] = [];

    private logger:any;

    constructor(logger: any) {
        this.logger = logger;
    }

    public setLogger(logger: any) {
        this.logger = logger;
    }

    public async saveImageStream(dataItem:any) {
        // dataItem.number
        // dataItem.title 
        // dataItem.pictureUrl
        // dataItem.details

        const imageHeight: number = 1080; // 800;
        const imageWidth: number = 1920; // 1280;

        const titleFont: string = 'bold 90px sans-serif';   // Title
        const detailFont: string = 'bold 90px sans-serif';    // row of game data

        const OutlineStrokeWidth: number = 30;
        const boarderStrokeWidth: number = 30;
        const boxStrokeWidth: number = 10;

        const backgroundColor: string = 'rgb(250, 250, 250)';
        const DrawingColor: string = 'rgb(0, 0, 30)';
        const textColor: string = 'rgb(50, 5, 250)';

        const TitleOffsetX: number = 100;
        const TitleOffsetY: number = 160;

        const DetailOffsetX: number = 100;
        const DetailOffsetY: number = 320;

        const PictureX: number = 600;
        const PictureY: number = 500;
        const PictureWidth: number = 400;
        const PictureHeight: number = 400;

        const img = pure.make(imageWidth, imageHeight);
        const ctx = img.getContext('2d');

        const fntBold = pure.registerFont('fonts/OpenSans-Bold.ttf','OpenSans-Bold');
        const fntRegular = pure.registerFont('fonts/OpenSans-Regular.ttf','OpenSans-Regular');
        const fntRegular2 = pure.registerFont('fonts/alata-regular.ttf','alata-regular');

        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        ctx.fillStyle = backgroundColor; 
        ctx.fillRect(0,0,imageWidth, imageHeight);


        // This works perfectly well! 

        try {
            this.logger.verbose("dataItem: " + JSON.stringify(dataItem, undefined, 2));
            const response:any = await axios.get(dataItem.pictureUrl, {responseType: "stream"} );
            const picture:any = await pure.decodeJPEGFromStream(response.data);
            await pure.encodeJPEGToStream(picture,fs.createWriteStream("picture.jpg"), 50);
            ctx.drawImage(picture,
                0, 0, picture.width, picture.height,             // source dimensions
                PictureX, PictureY, PictureWidth, PictureHeight  // destination dimensions
            );
        } catch (e) {
            this.logger.error("Failed to read picture: " + e);
        }

        // Draw the title
        const title: string = `#${dataItem.number} ${dataItem.title}`
        const titleLines: string[] = this.splitLine(title, 25, 2);       

        let lineNumber: number = 0;
        for (const titleLine of Object.keys(titleLines)) {
            ctx.fillStyle = textColor; 
            ctx.font = "120pt 'OpenSans-Bold'";
            ctx.fillText(titleLines[titleLine], TitleOffsetX, TitleOffsetY);
        }

        lineNumber = 0;
        const detailLines: string[] = this.splitLine(dataItem.details, 45, 3);

        for (const detailLine of Object.keys(detailLines)) {
            ctx.fillStyle = textColor; 
            ctx.font = "72pt 'alata-regular'";
            ctx.fillText(detailLines[detailLine], DetailOffsetX, DetailOffsetY + (lineNumber++ * 80));            
        }
    
        // await pure.encodeJPEGToStream(img, fs.createWriteStream(fileName), 50);

        const jpegImg = jpeg.encode(img, 50);
        // const jpegImgStream = new Readable({
        //     read() {
        //       this.push(jpegImg.data);
        //       this.push(null);
        //     }
        // });
        
        // How long is this image good for
        const goodForMins = 60;

        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + goodForMins);

        return {
            expires: expires.toUTCString(),
            imageType: "jpg",
            imageData: jpegImg,
            stream: null
        }
    }

    private splitLine(inStr: string, maxLineLength: number, maxLines: number) {
        const list: string[] = [];

        if (maxLines < 1 || maxLines > 10) {
            this.logger.error(`splitLine: maxLines too large (${maxLines})`)
            return list;
        }

        while (inStr.length > 0) {
            let breakIndex: number;
            if (inStr.length <= maxLineLength) {
                list.push(inStr);
                return list;
            }

            breakIndex = maxLineLength - 1;
            while (breakIndex > 0 && (inStr.charAt(breakIndex) !== ' ')) {
                breakIndex--;
            }

            list.push(inStr.substring(0, breakIndex));
            inStr = inStr.substring(breakIndex + 1);
        }
        return list;
    }
}