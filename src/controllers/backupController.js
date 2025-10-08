const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const BACKUP_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

exports.listBackups = (req, res) => {
    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(files.filter(f => f.endsWith('.gz')));
    });
};

exports.createBackup = (req, res) => {
    const filename = `backup_${Date.now()}.gz`;
    const filepath = path.join(BACKUP_DIR, filename);
    const cmd = `mongodump --uri='${process.env.MONGODB_URI}' --archive=${filepath} --gzip`;
    exec(cmd, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Backup created', filename });
    });
};

exports.restoreBackup = (req, res) => {
    const { filename } = req.body;
    const filepath = path.join(BACKUP_DIR, filename);
    const cmd = `mongorestore --uri='${process.env.MONGODB_URI}' --archive=${filepath} --gzip --drop`;
    exec(cmd, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Restore completed', filename });
    });
};