const destination = '/rental-fleet/' + location.search + '#apply';
document.querySelector('#current-inquiry').href = destination;
location.replace(destination);
