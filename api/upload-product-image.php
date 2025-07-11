<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gestisci richieste OPTIONS per CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verifica che sia una richiesta POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Metodo non consentito']);
    exit();
}

// Configurazione
$uploadDir = '../assets/img/products/';
$maxFileSize = 5 * 1024 * 1024; // 5MB
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// Verifica che la cartella di destinazione esista
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        echo json_encode(['success' => false, 'message' => 'Impossibile creare la cartella di destinazione']);
        exit();
    }
}

// Verifica che sia stato caricato un file
if (!isset($_FILES['productImage']) || $_FILES['productImage']['error'] !== UPLOAD_ERR_OK) {
    $errorMessage = 'Errore nel caricamento del file';
    
    if (isset($_FILES['productImage']['error'])) {
        switch ($_FILES['productImage']['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errorMessage = 'File troppo grande';
                break;
            case UPLOAD_ERR_PARTIAL:
                $errorMessage = 'Caricamento parziale del file';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errorMessage = 'Nessun file selezionato';
                break;
            case UPLOAD_ERR_NO_TMP_DIR:
                $errorMessage = 'Cartella temporanea mancante';
                break;
            case UPLOAD_ERR_CANT_WRITE:
                $errorMessage = 'Impossibile scrivere il file';
                break;
        }
    }
    
    echo json_encode(['success' => false, 'message' => $errorMessage]);
    exit();
}

$file = $_FILES['productImage'];

// Verifica dimensione file
if ($file['size'] > $maxFileSize) {
    echo json_encode(['success' => false, 'message' => 'File troppo grande. Massimo 5MB consentiti']);
    exit();
}

// Verifica tipo MIME
if (!in_array($file['type'], $allowedTypes)) {
    echo json_encode(['success' => false, 'message' => 'Tipo di file non consentito. Usa JPG, PNG, GIF o WebP']);
    exit();
}

// Ottieni informazioni sul file
$fileInfo = pathinfo($file['name']);
$extension = strtolower($fileInfo['extension']);

// Verifica estensione
if (!in_array($extension, $allowedExtensions)) {
    echo json_encode(['success' => false, 'message' => 'Estensione file non consentita']);
    exit();
}

// Genera nome file sicuro
$productId = isset($_POST['productId']) ? preg_replace('/[^a-z0-9\-_]/', '', strtolower($_POST['productId'])) : '';
if (empty($productId)) {
    echo json_encode(['success' => false, 'message' => 'ID prodotto mancante o non valido']);
    exit();
}

$fileName = $productId . '.' . $extension;
$filePath = $uploadDir . $fileName;

// Verifica che il file sia realmente un'immagine
$imageInfo = getimagesize($file['tmp_name']);
if ($imageInfo === false) {
    echo json_encode(['success' => false, 'message' => 'Il file non è un\'immagine valida']);
    exit();
}

// Sposta il file nella cartella di destinazione
if (move_uploaded_file($file['tmp_name'], $filePath)) {
    // Ottimizza l'immagine se necessario
    $optimized = optimizeImage($filePath, $imageInfo[2]);
    
    echo json_encode([
        'success' => true, 
        'message' => 'Immagine caricata con successo',
        'fileName' => $fileName,
        'filePath' => 'assets/img/products/' . $fileName,
        'optimized' => $optimized
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Errore nel salvataggio del file']);
}

/**
 * Ottimizza l'immagine riducendo la qualità se necessario
 */
function optimizeImage($filePath, $imageType) {
    $maxWidth = 800;
    $maxHeight = 600;
    $quality = 85;
    
    try {
        // Ottieni dimensioni originali
        list($width, $height) = getimagesize($filePath);
        
        // Se l'immagine è già piccola, non fare nulla
        if ($width <= $maxWidth && $height <= $maxHeight) {
            return false;
        }
        
        // Calcola nuove dimensioni mantenendo le proporzioni
        $ratio = min($maxWidth / $width, $maxHeight / $height);
        $newWidth = intval($width * $ratio);
        $newHeight = intval($height * $ratio);
        
        // Crea immagine di origine
        switch ($imageType) {
            case IMAGETYPE_JPEG:
                $source = imagecreatefromjpeg($filePath);
                break;
            case IMAGETYPE_PNG:
                $source = imagecreatefrompng($filePath);
                break;
            case IMAGETYPE_GIF:
                $source = imagecreatefromgif($filePath);
                break;
            default:
                return false;
        }
        
        if (!$source) return false;
        
        // Crea immagine di destinazione
        $destination = imagecreatetruecolor($newWidth, $newHeight);
        
        // Mantieni trasparenza per PNG e GIF
        if ($imageType == IMAGETYPE_PNG || $imageType == IMAGETYPE_GIF) {
            imagealphablending($destination, false);
            imagesavealpha($destination, true);
            $transparent = imagecolorallocatealpha($destination, 255, 255, 255, 127);
            imagefilledrectangle($destination, 0, 0, $newWidth, $newHeight, $transparent);
        }
        
        // Ridimensiona
        imagecopyresampled($destination, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        
        // Salva immagine ottimizzata
        switch ($imageType) {
            case IMAGETYPE_JPEG:
                imagejpeg($destination, $filePath, $quality);
                break;
            case IMAGETYPE_PNG:
                imagepng($destination, $filePath, 9);
                break;
            case IMAGETYPE_GIF:
                imagegif($destination, $filePath);
                break;
        }
        
        // Pulisci memoria
        imagedestroy($source);
        imagedestroy($destination);
        
        return true;
        
    } catch (Exception $e) {
        error_log('Errore ottimizzazione immagine: ' . $e->getMessage());
        return false;
    }
}
?>