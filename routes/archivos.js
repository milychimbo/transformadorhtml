const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

const upload = multer({
    limits: { fieldSize: 150 * 1024 * 1024 } // 150MB
});

app.use(bodyParser.json({ limit: '150mb' }));
app.use(bodyParser.urlencoded({ limit: '150mb', extended: true }));

app.post('/convert', upload.none(), async (req, res) => {
    const htmlContent = req.body.html;

    if (!htmlContent) {
        fs.appendFileSync('error.log', 'No se proporcionó HTML\n');
        return res.status(400).send('No se proporcionó HTML');
    }

    try {
        const pdfBuffer = await req.cluster.execute(htmlContent);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'attachment; filename="document.pdf"'
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error al generar el PDF:', error);
        fs.appendFileSync('error.log', error + '\n');
        res.status(500).send('Error al generar el PDF');
    }
});

module.exports = app;
