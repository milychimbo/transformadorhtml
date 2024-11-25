const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const path = require('path');
const createError = require('http-errors');
const fs = require('fs');
const puppeteer = require('puppeteer-cluster');

const app = express();
let cluster;

const initCluster = async () => {
    try {
        cluster = await puppeteer.Cluster.launch({
            concurrency: puppeteer.Cluster.CONCURRENCY_PAGE,
            maxConcurrency: 10,
            puppeteerOptions: {
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--single-process',
                    '--disable-gpu',
                ],
            },
        });

        cluster.task(async ({ page, data: htmlContent }) => {
            await page.setViewport({ width: 1280, height: 800 });
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                timeout: 60000,
            });
            return pdfBuffer;
        });

        console.log('Cluster inicializado correctamente');
    } catch (error) {
        console.error('Error al inicializar el clúster:', error);
        fs.appendFileSync('errorCluster.log', error + '\n');
        process.exit(1);
    }
};

initCluster().then(() => {
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');

    app.use(logger('dev'));
    app.use(bodyParser.json({ limit: '150mb' }));
    app.use(bodyParser.urlencoded({ limit: '150mb', extended: true }));
    app.use(express.json());
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, 'public')));

    app.use((req, res, next) => {
        req.cluster = cluster;
        next();
    });

    app.use('/transformador/', require('./routes/index'));
    app.use('/transformador/archivos', require('./routes/archivos'));

    app.use(function(req, res, next) {
        next(createError(404));
    });

    app.use(function(err, req, res, next) {
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};
        res.status(err.status || 500);
        res.render('error');
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Servidor escuchando en el puerto ${port}`);
    });
}).catch(error => {
    console.error('Error al inicializar el clúster:', error);
    fs.appendFileSync('errorCluster.log', error + '\n');
    process.exit(1);
});

const gracefulShutdown = async () => {
    if (cluster) {
        await cluster.idle();
        await cluster.close();
    }
    process.exit(0);
};

process.on('exit', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = app;
