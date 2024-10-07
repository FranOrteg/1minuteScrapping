import { chromium } from "playwright";
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const downloadImages = async (url,savePath) => {
    const writer = fs.createWriteStream(savePath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

(async () => {

    const browser = await chromium.launch({ headless: true });

    const page = await browser.newPage();

    await page.goto("https://www.amazon.es/s?k=playstation+5&crid=HUJPYGWTSOFS&sprefix=playstation%2Caps%2C97&ref=nb_sb_ss_ts-doa-p_1_11");

    await page.waitForSelector('.s-card-container'); 

    const products = await page.$$eval('.s-card-container',
        (results) => (
            results.map((el) => {
                const title = el.querySelector('h2')?.innerText;
                if (!title) return null;

                const image = el.querySelector('img')?.getAttribute('src');

                const price = el.querySelector('.a-price .a-offscreen')?.innerText;

                const link = el.querySelector('.a-link-normal')?.getAttribute('href');

                return {
                    title,
                    image,
                    price,
                    link: link ? `https://www.amazon.es${link}` : null
                };
            }).filter(item => item !== null)
        )
    );

    console.log(products);
    
    const directory = process.env.IMAGE_DIR || path.resolve('./scraped_images');
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true }); 
  }
    
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (product.image) {
          try {
            const filePath = path.resolve(directory, `image_${i + 1}.jpg`);
            await downloadImages(product.image, filePath);
            console.log(`Imagen ${i + 1} descargada exitosamente.`);
          } catch (error) {
            console.error(`Error al descargar la imagen ${i + 1}: ${error.message}`);
          }
        }
      }

    await browser.close();
    
})();



