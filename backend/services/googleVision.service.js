const axios = require('axios');
const { AppError } = require('../utils/appError');

const VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

function assertBuffer(imageBuffer) {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    throw new AppError('imageBuffer must be a valid Buffer', 400, 'INVALID_IMAGE_BUFFER');
  }
}

function getApiKey() {
  const apiKey = String(process.env.GOOGLE_API_KEY || process.env.GOOGLE_VISION_API_KEY || '').trim();
  if (!apiKey) {
    throw new AppError(
      'Missing GOOGLE_API_KEY or GOOGLE_VISION_API_KEY in environment variables',
      500,
      'ENV_VALIDATION_ERROR'
    );
  }
  return apiKey;
}


function extractGoogleErrorPayload(error) {
  const upstream = error?.response?.data?.error;
  if (upstream && typeof upstream === 'object') {
    return {
      message: upstream.message || 'Google Vision API returned an error',
      code: upstream.status || `VISION_${upstream.code || 'API_ERROR'}`,
      details: upstream,
      statusCode: Number(upstream.code) >= 400 && Number(upstream.code) < 600 ? Number(upstream.code) : 502,
    };
  }

  return {
    message: error.message || 'Google Vision API request failed',
    code: 'VISION_API_ERROR',
    details: error?.response?.data || null,
    statusCode: 502,
  };
}

async function callVisionAnnotate(imageBuffer, featureType) {
  assertBuffer(imageBuffer);
  const apiKey = getApiKey();

  const base64Image = imageBuffer.toString('base64');

  try {
    const response = await axios.post(
      `${VISION_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
      {
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: featureType }],
          },
        ],
      },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const apiResponse = response?.data?.responses?.[0];
    if (!apiResponse) {
      throw new AppError(
        'Google Vision API returned an invalid response (responses[0] missing)',
        502,
        'VISION_API_INVALID_RESPONSE'
      );
    }

    if (apiResponse.error) {
      throw new AppError(
        apiResponse.error.message || 'Google Vision API processing error',
        502,
        apiResponse.error.status || 'VISION_API_ERROR',
        apiResponse.error
      );
    }

    return apiResponse;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const normalized = extractGoogleErrorPayload(error);
    throw new AppError(normalized.message, normalized.statusCode, normalized.code, normalized.details);
  }
}

async function detectText(imageBuffer) {
  const result = await callVisionAnnotate(imageBuffer, 'TEXT_DETECTION');
  const annotations = Array.isArray(result.textAnnotations) ? result.textAnnotations : [];

  return {
    fullText: annotations[0]?.description || '',
    annotations,
  };
}

async function detectDocumentText(imageBuffer) {
  const result = await callVisionAnnotate(imageBuffer, 'DOCUMENT_TEXT_DETECTION');
  const fullTextAnnotation = result.fullTextAnnotation || {};

  return {
    fullText: fullTextAnnotation.text || '',
    pages: Array.isArray(fullTextAnnotation.pages) ? fullTextAnnotation.pages : [],
  };
}

async function detectLabels(imageBuffer) {
  const result = await callVisionAnnotate(imageBuffer, 'LABEL_DETECTION');
  const annotations = Array.isArray(result.labelAnnotations) ? result.labelAnnotations : [];

  return {
    labels: annotations.map((item) => ({
      description: item.description || '',
      score: Number(item.score || 0),
      topicality: Number(item.topicality || 0),
    })),
  };
}

async function detectFaces(imageBuffer) {
  const result = await callVisionAnnotate(imageBuffer, 'FACE_DETECTION');
  return {
    faces: Array.isArray(result.faceAnnotations) ? result.faceAnnotations : [],
  };
}

async function detectLogos(imageBuffer) {
  const result = await callVisionAnnotate(imageBuffer, 'LOGO_DETECTION');
  return {
    logos: Array.isArray(result.logoAnnotations) ? result.logoAnnotations : [],
  };
}

async function detectPdfText(pdfBuffer) {
  assertBuffer(pdfBuffer);
  const apiKey = getApiKey();
  const base64Pdf = pdfBuffer.toString('base64');

  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/files:annotate?key=${encodeURIComponent(apiKey)}`,
      {
        requests: [
          {
            inputConfig: {
              content: base64Pdf,
              mimeType: 'application/pdf',
            },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      },
      {
        timeout: 25000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const apiResponse = response?.data?.responses?.[0];
    if (!apiResponse) {
      throw new AppError(
        'Google Vision API returned an invalid response for PDF (responses[0] missing)',
        502,
        'VISION_API_INVALID_RESPONSE'
      );
    }

    if (apiResponse.error) {
      throw new AppError(
        apiResponse.error.message || 'Google Vision API PDF processing error',
        502,
        apiResponse.error.status || 'VISION_API_ERROR',
        apiResponse.error
      );
    }

    // PDF files return page responses nested in responses[i].responses
    let fullText = '';
    if (Array.isArray(apiResponse.responses)) {
      fullText = apiResponse.responses
        .map((pageResp) => pageResp.fullTextAnnotation?.text || '')
        .join('\n')
        .trim();
    } else if (apiResponse.fullTextAnnotation?.text) {
      fullText = apiResponse.fullTextAnnotation.text.trim();
    }

    return { fullText };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const normalized = extractGoogleErrorPayload(error);
    throw new AppError(normalized.message, normalized.statusCode, normalized.code, normalized.details);
  }
}

module.exports = {
  detectText,
  detectDocumentText,
  detectLabels,
  detectFaces,
  detectLogos,
  detectPdfText,
};
