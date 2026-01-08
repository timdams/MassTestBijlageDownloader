/**
 * Grade Importer Bookmarklet Loader
 * 
 * Usage: Create a new bookmark and paste the minified version of this code as the URL.
 * javascript:(function(){var s=document.createElement('script');s.src='http://127.0.0.1:8080/importer.js?t='+Date.now();document.body.appendChild(s);})();
 * 
 * Note: For development, we are serving files from localhost. 
 * In production, this would point to a hosted version of importer.js.
 */

(function() {
    // Check if already loaded
    if (window.GradeImporter) {
        alert('Grade Importer is already loaded!');
        return;
    }

    console.log('Loading Grade Importer...');
    
    // Load SheetJS (Excel parser) from CDN
    var scriptSheetJS = document.createElement('script');
    scriptSheetJS.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
    scriptSheetJS.onload = function() {
        console.log('SheetJS loaded.');
        loadImporter();
    };
    scriptSheetJS.onerror = function() {
        alert('Failed to load SheetJS library.');
    };
    document.head.appendChild(scriptSheetJS);

    function loadImporter() {
        // Load our main importer script
        // For local development, we assume these files are served via a local web server (or we paste the full code)
        // Since we are in a text-based environment without a running server for the user to access easily,
        // we will construct the importer logic HERE or inject it directly.
        // BUT, the plan was to have a separate file. 
        // We will inject the script tag pointing to a local file? Use "File System Access"? 
        // Browsers block local file access for security.
        
        // WORKAROUND: For this prototype, I will fetch the code from a relative path if possible, 
        // OR better yet, since the user is on their file system, they might not have a server running.
        // I will assume for the demo that I can append the importer code directly here, 
        // OR I will ask the user to Paste the code.
        
        // BETTER APPROACH for "importer.js":
        // I will create `importer.js` and for the verification, I will instruct the user to copy-paste it 
        // or I will assume they can run a simple python server.
        // Given the constraint "laagdrempelig", copy-pasting code into a bookmarklet is hard if it's huge.
        
        // Let's stick to the plan: create `importer.js`. 
        // The loader will try to load it. 
        // Since I cannot start a webserver that is accessible to the browser easily (CORS/etc),
        // I will create a "bundled" version for the final bookmarklet later.
        // For now, let's assume we can load it from a relative path if testing locally? No.
        
        // ADJUSTMENT: The loader will inject the `importer.js` logic.
        // Actually, to keep files clean, I will write `importer.js`. 
        // The bookmarklet code I give the user will need to be the BUNDLED code.
        
        // Let's create `importer.js` as the source of truth.
        
        var scriptImporter = document.createElement('script');
        // Pointing to a hypothetical local server for development (or file protocol if allowed, usually not)
        // For the sake of the exercise, I'll assume strict separation. 
        // But practically, I should probably combine them for the user in the end.
        
        // Let's assume the user will simply copy-paste the content of importer.js into the console for testing
        // OR create a bookmarklet with the full code.
        
        // I'll create the file, and then we figure out how to run it.
        // scriptImporter.src = 'importer.js'; 
        // document.body.appendChild(scriptImporter);
    }
})();
