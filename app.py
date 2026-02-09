from flask import Flask, render_template, request, send_file, jsonify, session
from werkzeug.utils import secure_filename
import PyPDF2
from pathlib import Path
import logging
import os
import uuid
from datetime import datetime, timedelta
import shutil

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key")
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
BASE_DIR = Path("/tmp")
app.config['UPLOAD_FOLDER'] = BASE_DIR / "uploads"
app.config['OUTPUT_FOLDER'] = BASE_DIR / "outputs"
app.config['ALLOWED_EXTENSIONS'] = {'pdf'}

# Create necessary folders
app.config['UPLOAD_FOLDER'].mkdir(exist_ok=True)
app.config['OUTPUT_FOLDER'].mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s'
)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def get_session_folder(folder_type='upload'):
    """Get or create a unique session folder"""
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    
    base_folder = app.config['UPLOAD_FOLDER'] if folder_type == 'upload' else app.config['OUTPUT_FOLDER']
    session_folder = base_folder / session['session_id']
    session_folder.mkdir(exist_ok=True)
    return session_folder


def cleanup_old_files():
    """Clean up files older than 1 hour"""
    try:
        cutoff_time = datetime.now() - timedelta(hours=1)
        for folder in [app.config['UPLOAD_FOLDER'], app.config['OUTPUT_FOLDER']]:
            for item in folder.iterdir():
                if item.is_dir():
                    item_time = datetime.fromtimestamp(item.stat().st_mtime)
                    if item_time < cutoff_time:
                        shutil.rmtree(item)
    except Exception as e:
        logging.error(f"Cleanup error: {e}")


@app.route('/')
def index():
    cleanup_old_files()
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Only PDF files are allowed'}), 400
        
        filename = secure_filename(file.filename)
        session_folder = get_session_folder('upload')
        filepath = session_folder / filename
        file.save(filepath)
        
        logging.info(f"File uploaded: {filename}")
        return jsonify({
            'success': True,
            'filename': filename,
            'message': 'File uploaded successfully'
        })
    except Exception as e:
        logging.error(f"Upload error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/metadata', methods=['POST'])
def read_metadata():
    try:
        data = request.json
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'error': 'No filename provided'}), 400
        
        session_folder = get_session_folder('upload')
        filepath = session_folder / secure_filename(filename)
        
        if not filepath.exists():
            return jsonify({'error': 'File not found'}), 404
        
        reader = PyPDF2.PdfReader(filepath)
        meta = reader.metadata
        
        metadata = {
            'pages': len(reader.pages),
            'author': meta.author if meta.author else 'N/A',
            'creator': meta.creator if meta.creator else 'N/A',
            'producer': meta.producer if meta.producer else 'N/A',
            'subject': meta.subject if meta.subject else 'N/A',
            'title': meta.title if meta.title else 'N/A',
            'encrypted': reader.is_encrypted
        }
        
        logging.info(f"Metadata read for: {filename}")
        return jsonify({'success': True, 'metadata': metadata})
    except Exception as e:
        logging.error(f"Metadata error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/write-metadata', methods=['POST'])
def write_metadata():
    try:
        data = request.json
        filename = data.get('filename')
        metadata = data.get('metadata', {})
        
        if not filename:
            return jsonify({'error': 'No filename provided'}), 400
        
        session_folder = get_session_folder('upload')
        filepath = session_folder / secure_filename(filename)
        
        if not filepath.exists():
            return jsonify({'error': 'File not found'}), 404
        
        reader = PyPDF2.PdfReader(filepath)
        writer = PyPDF2.PdfWriter()
        
        for page in reader.pages:
            writer.add_page(page)
        
        writer.add_metadata(metadata)
        
        output_folder = get_session_folder('output')
        output_filename = f"metadata_{filename}"
        output_path = output_folder / output_filename
        
        with open(output_path, 'wb') as f:
            writer.write(f)
        
        logging.info(f"Metadata written to: {output_filename}")
        return jsonify({
            'success': True,
            'filename': output_filename,
            'message': 'Metadata updated successfully'
        })
    except Exception as e:
        logging.error(f"Write metadata error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/merge', methods=['POST'])
def merge_pdfs():
    try:
        data = request.json
        filenames = data.get('filenames', [])
        
        if len(filenames) < 2:
            return jsonify({'error': 'At least 2 files required for merging'}), 400
        
        session_folder = get_session_folder('upload')
        merger = PyPDF2.PdfMerger()
        
        for filename in filenames:
            filepath = session_folder / secure_filename(filename)
            if not filepath.exists():
                return jsonify({'error': f'File not found: {filename}'}), 404
            merger.append(str(filepath))
        
        output_folder = get_session_folder('output')
        output_filename = f"merged_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        output_path = output_folder / output_filename
        
        merger.write(str(output_path))
        merger.close()
        
        logging.info(f"PDFs merged: {output_filename}")
        return jsonify({
            'success': True,
            'filename': output_filename,
            'message': f'Successfully merged {len(filenames)} PDFs'
        })
    except Exception as e:
        logging.error(f"Merge error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/split', methods=['POST'])
def split_pdf():
    try:
        data = request.json
        filename = data.get('filename')
        
        if not filename:
            return jsonify({'error': 'No filename provided'}), 400
        
        session_folder = get_session_folder('upload')
        filepath = session_folder / secure_filename(filename)
        
        if not filepath.exists():
            return jsonify({'error': 'File not found'}), 404
        
        reader = PyPDF2.PdfReader(filepath)
        output_folder = get_session_folder('output')
        output_files = []
        
        for i, page in enumerate(reader.pages):
            writer = PyPDF2.PdfWriter()
            writer.add_page(page)
            output_filename = f"page_{i + 1}_{filename}"
            output_path = output_folder / output_filename
            
            with open(output_path, 'wb') as f:
                writer.write(f)
            output_files.append(output_filename)
        
        logging.info(f"PDF split into {len(output_files)} files")
        return jsonify({
            'success': True,
            'files': output_files,
            'message': f'PDF split into {len(output_files)} pages'
        })
    except Exception as e:
        logging.error(f"Split error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/encrypt', methods=['POST'])
def encrypt_pdf():
    try:
        data = request.json
        filename = data.get('filename')
        password = data.get('password')
        
        if not filename or not password:
            return jsonify({'error': 'Filename and password required'}), 400
        
        session_folder = get_session_folder('upload')
        filepath = session_folder / secure_filename(filename)
        
        if not filepath.exists():
            return jsonify({'error': 'File not found'}), 404
        
        reader = PyPDF2.PdfReader(filepath)
        writer = PyPDF2.PdfWriter()
        
        for page in reader.pages:
            writer.add_page(page)
        
        writer.encrypt(password)
        
        output_folder = get_session_folder('output')
        output_filename = f"encrypted_{filename}"
        output_path = output_folder / output_filename
        
        with open(output_path, 'wb') as f:
            writer.write(f)
        
        logging.info(f"PDF encrypted: {output_filename}")
        return jsonify({
            'success': True,
            'filename': output_filename,
            'message': 'PDF encrypted successfully'
        })
    except Exception as e:
        logging.error(f"Encrypt error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/decrypt', methods=['POST'])
def decrypt_pdf():
    try:
        data = request.json
        filename = data.get('filename')
        password = data.get('password')
        
        if not filename or not password:
            return jsonify({'error': 'Filename and password required'}), 400
        
        session_folder = get_session_folder('upload')
        filepath = session_folder / secure_filename(filename)
        
        if not filepath.exists():
            return jsonify({'error': 'File not found'}), 404
        
        reader = PyPDF2.PdfReader(filepath)
        
        if not reader.is_encrypted:
            return jsonify({'error': 'PDF is not encrypted'}), 400
        
        if not reader.decrypt(password):
            return jsonify({'error': 'Incorrect password'}), 401
        
        writer = PyPDF2.PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        
        output_folder = get_session_folder('output')
        output_filename = f"decrypted_{filename}"
        output_path = output_folder / output_filename
        
        with open(output_path, 'wb') as f:
            writer.write(f)
        
        logging.info(f"PDF decrypted: {output_filename}")
        return jsonify({
            'success': True,
            'filename': output_filename,
            'message': 'PDF decrypted successfully'
        })
    except Exception as e:
        logging.error(f"Decrypt error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/extract-text', methods=['POST'])
def extract_text():
    try:
        data = request.json
        filename = data.get('filename')
        pages = data.get('pages', [])
        
        if not filename:
            return jsonify({'error': 'No filename provided'}), 400
        
        session_folder = get_session_folder('upload')
        filepath = session_folder / secure_filename(filename)
        
        if not filepath.exists():
            return jsonify({'error': 'File not found'}), 404
        
        reader = PyPDF2.PdfReader(filepath)
        extracted_text = {}
        
        # If no pages specified, extract from all
        if not pages:
            pages = list(range(len(reader.pages)))
        
        for page_num in pages:
            if 0 <= page_num < len(reader.pages):
                page = reader.pages[page_num]
                text = page.extract_text()
                extracted_text[page_num + 1] = text if text else "[No text found]"
        
        logging.info(f"Text extracted from {len(extracted_text)} pages")
        return jsonify({
            'success': True,
            'text': extracted_text,
            'message': f'Text extracted from {len(extracted_text)} pages'
        })
    except Exception as e:
        logging.error(f"Extract text error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/download/<filename>')
def download_file(filename):
    try:
        output_folder = get_session_folder('output')
        filepath = output_folder / secure_filename(filename)
        
        if not filepath.exists():
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(filepath, as_attachment=True, download_name=filename)
    except Exception as e:
        logging.error(f"Download error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/list-files', methods=['GET'])
def list_files():
    try:
        session_folder = get_session_folder('upload')
        files = []
        
        if session_folder.exists():
            for file in session_folder.iterdir():
                if file.is_file() and file.suffix == '.pdf':
                    files.append({
                        'name': file.name,
                        'size': file.stat().st_size
                    })
        
        return jsonify({'success': True, 'files': files})
    except Exception as e:
        logging.error(f"List files error: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
