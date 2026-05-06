from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import secrets
import uuid

from pca_compressor import compress_image, generate_comparison_plot

app = Flask(__name__)
CORS(app)
app.secret_key = secrets.token_hex(16)

IS_VERCEL = "VERCEL" in os.environ

if IS_VERCEL:
    UPLOAD_FOLDER = '/tmp/images'
    OUTPUT_FOLDER = '/tmp/output'
else:
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'images')
    OUTPUT_FOLDER = os.path.join(os.path.dirname(__file__), 'output')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/compress', methods=['POST'])
def api_compress():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']

    if not file.filename:
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': f'File type not allowed. Supported: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

    try:
        num_components = max(1, min(int(request.form.get('num_components', 50)), 500))
    except (ValueError, TypeError):
        num_components = 50

    uid             = uuid.uuid4().hex[:8]
    ext             = file.filename.rsplit('.', 1)[1].lower()
    safe_name       = f"{uid}_original.{ext}"
    compressed_name = f"{uid}_compressed.png"
    plot_name       = f"{uid}_plot.png"

    upload_path     = os.path.join(UPLOAD_FOLDER, safe_name)
    compressed_path = os.path.join(OUTPUT_FOLDER, compressed_name)
    plot_path       = os.path.join(OUTPUT_FOLDER, plot_name)

    file.save(upload_path)

    stats = compress_image(upload_path, num_components=num_components, output_path=compressed_path)
    if stats is None:
        return jsonify({'error': 'Compression failed. Check that the image is valid.'}), 500

    plot_result = generate_comparison_plot(upload_path, compressed_path, plot_path, stats=stats)

    return jsonify({
        'original_url':       f'/images/{safe_name}',
        'compressed_url':     f'/output/{compressed_name}',
        'plot_url':           f'/output/{plot_name}' if plot_result else None,
        'compressed_filename': compressed_name,
        'original_size_bytes':   stats['original_size'],
        'compressed_size_bytes': stats['compressed_size'],
        'original_size_kb':      round(stats['original_size'] / 1024, 1),
        'compressed_size_kb':    round(stats['compressed_size'] / 1024, 1),
        'compression_ratio':     stats['compression_ratio'],
        'explained_variance':    stats['explained_variance'],
        'num_components_used':   stats['num_components_used'],
        'original_dimensions':   list(stats['original_dimensions']),
    })


@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route('/output/<path:filename>')
def serve_output(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)


@app.route('/download/<path:filename>')
def download_file(filename):
    return send_from_directory(OUTPUT_FOLDER, filename, as_attachment=True)


if __name__ == '__main__':
    print("PCA Image Compressor running at http://localhost:5000")
    app.run(debug=True, port=5000)
