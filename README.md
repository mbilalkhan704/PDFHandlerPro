# PDF Handler Pro - Advanced PDF Management Web Application

A professional, fully responsive web application for comprehensive PDF file management built with Flask, HTML, CSS, and JavaScript.

## Features

### 🎯 Core Functionality
- **Upload PDFs**: Drag-and-drop or browse to upload multiple PDF files (up to 50MB each)
- **View Metadata**: Read and display PDF properties (title, author, pages, etc.)
- **Edit Metadata**: Update PDF metadata (title, author, subject, creator)
- **Merge PDFs**: Combine multiple PDF files into a single document
- **Split PDFs**: Extract individual pages from a PDF file
- **Encrypt PDFs**: Add password protection to PDF files
- **Decrypt PDFs**: Remove password protection from encrypted PDFs
- **Extract Text**: Extract text content from specific pages or entire PDFs

### 🎨 Design Features
- **Fully Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Beautiful gradient design with smooth animations
- **Interactive**: Real-time feedback with toast notifications
- **User-Friendly**: Intuitive interface with clear visual indicators
- **Secure**: Session-based file management with automatic cleanup

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Step 1: Clone or Download the Project
```bash
# If using git
git clone <repository-url>
cd pdf-handler-pro

# Or download and extract the ZIP file
```

### Step 2: Create a Virtual Environment (Recommended)
```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Run the Application
```bash
python app.py
```

The application will start on `http://localhost:5000`

## Project Structure

```
pdf-handler-pro/
│
├── app.py                      # Flask backend application
├── requirements.txt            # Python dependencies
├── README.md                   # This file
│
├── templates/
│   └── index.html             # Main HTML template
│
├── static/
│   ├── css/
│   │   └── style.css          # Comprehensive styles
│   └── js/
│       └── app.js             # Frontend JavaScript
│
├── uploads/                   # Temporary upload storage (auto-created)
├── outputs/                   # Processed file storage (auto-created)
└── pdf_handler.log           # Application logs (auto-created)
```

## Usage Guide

### 1. Upload Files
- **Method 1**: Drag and drop PDF files onto the upload area
- **Method 2**: Click "Select Files" button and browse for PDFs
- Multiple files can be uploaded at once
- Progress bar shows upload status

### 2. View Metadata
1. Click "View Metadata" operation card
2. Select a PDF file from the dropdown
3. Click "View Metadata" button
4. See complete PDF information displayed

### 3. Edit Metadata
1. Click "Edit Metadata" operation card
2. Select a PDF file
3. Enter new values for Title, Author, Subject, Creator
4. Click "Update Metadata"
5. Download the updated PDF

### 4. Merge PDFs
1. Upload at least 2 PDF files
2. Click "Merge PDFs" operation card
3. Select files to merge (in order)
4. Click "Merge PDFs"
5. Download the merged PDF

### 5. Split PDF
1. Click "Split PDF" operation card
2. Select a PDF file
3. Click "Split PDF"
4. Individual page PDFs will be automatically downloaded

### 6. Encrypt PDF
1. Click "Encrypt PDF" operation card
2. Select a PDF file
3. Enter and confirm a password
4. Click "Encrypt PDF"
5. Download the encrypted PDF

### 7. Decrypt PDF
1. Click "Decrypt PDF" operation card
2. Select an encrypted PDF file
3. Enter the password
4. Click "Decrypt PDF"
5. Download the decrypted PDF

### 8. Extract Text
1. Click "Extract Text" operation card
2. Select a PDF file
3. Optionally specify page numbers (0-indexed, comma-separated)
4. Click "Extract Text"
5. View extracted text in the modal

## API Endpoints

### POST /upload
Upload a PDF file
- **Body**: FormData with 'file' field
- **Response**: JSON with filename and success status

### POST /metadata
Read PDF metadata
- **Body**: `{ "filename": "example.pdf" }`
- **Response**: JSON with metadata object

### POST /write-metadata
Update PDF metadata
- **Body**: `{ "filename": "example.pdf", "metadata": {...} }`
- **Response**: JSON with output filename

### POST /merge
Merge multiple PDFs
- **Body**: `{ "filenames": ["file1.pdf", "file2.pdf"] }`
- **Response**: JSON with merged filename

### POST /split
Split PDF into pages
- **Body**: `{ "filename": "example.pdf" }`
- **Response**: JSON with array of page filenames

### POST /encrypt
Encrypt PDF with password
- **Body**: `{ "filename": "example.pdf", "password": "secret" }`
- **Response**: JSON with encrypted filename

### POST /decrypt
Decrypt PDF
- **Body**: `{ "filename": "example.pdf", "password": "secret" }`
- **Response**: JSON with decrypted filename

### POST /extract-text
Extract text from PDF
- **Body**: `{ "filename": "example.pdf", "pages": [0, 1, 2] }`
- **Response**: JSON with extracted text per page

### GET /download/<filename>
Download a processed file
- **Response**: File download

### GET /list-files
List uploaded files in current session
- **Response**: JSON with array of file objects

## Security Features

- **Session-based**: Each user has their own isolated file storage
- **Auto-cleanup**: Files older than 1 hour are automatically deleted
- **File validation**: Only PDF files are accepted
- **Size limits**: Maximum 50MB per file
- **Secure filenames**: Werkzeug secure_filename prevents directory traversal

## Configuration

### Modify in `app.py`:

```python
# Maximum file size (default: 50MB)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

# File cleanup time (in cleanup_old_files function)
cutoff_time = datetime.now() - timedelta(hours=1)  # Change hours value

# Server settings (at bottom of app.py)
app.run(debug=True, host='0.0.0.0', port=5000)
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera
- Mobile browsers

## Troubleshooting

### Issue: Upload fails
- Check file size is under 50MB
- Ensure file is a valid PDF
- Check console for errors

### Issue: Downloads don't work
- Check popup blocker settings
- Ensure browser allows downloads
- Try right-click and "Save link as..."

### Issue: Operations fail
- Ensure file was uploaded successfully
- Check if PDF is corrupted
- For encrypted PDFs, verify password is correct

## Development

### Running in Debug Mode
```bash
# Debug mode is enabled by default in app.py
python app.py
```

### Customizing Styles
Edit `static/css/style.css` to modify:
- Colors (CSS variables at top)
- Layouts and spacing
- Animations and transitions
- Responsive breakpoints

### Adding New Features
1. Add backend endpoint in `app.py`
2. Create operation function in `static/js/app.js`
3. Add operation card in `templates/index.html`
4. Style new elements in `static/css/style.css`

## Performance Optimization

- Session-based file management reduces server load
- Automatic cleanup prevents disk space issues
- Efficient file handling with streams
- Minimal dependencies for fast startup

## License

This project is open source and available for personal and commercial use.

## Support

For issues or questions:
1. Check this README
2. Review application logs in `pdf_handler.log`
3. Check browser console for JavaScript errors
4. Ensure all dependencies are installed correctly

## Acknowledgments

- Built with Flask (Python web framework)
- PyPDF2 for PDF manipulation
- Font Awesome for icons
- Modern CSS3 and JavaScript ES6+

## Version History

### v1.0.0 (Current)
- Initial release
- All core PDF operations
- Responsive design
- Session management
- Auto-cleanup

---

**Made with ❤️ for professional PDF management**
