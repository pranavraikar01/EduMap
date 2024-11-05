from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
import io

app = Flask(__name__)
CORS(app)  # To allow cross-origin requests

@app.route('/extract-text', methods=['POST'])
def extract_text():
    try:
        # Get the uploaded PDF file from the request
        pdf_file = request.files['file']
        
        # Open the PDF file in binary mode
        pdf_reader = PyPDF2.PdfReader(pdf_file)

        # Initialize a variable to store all the extracted text
        extracted_text = ""

        # Loop through each page in the PDF and extract text
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            extracted_text += page.extract_text()

        # Return the extracted text as a JSON response
        return jsonify({"text": extracted_text}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
