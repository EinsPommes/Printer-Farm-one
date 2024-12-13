// Printer Management
document.addEventListener('DOMContentLoaded', function() {
    // Initialize modals
    const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
    const editPrinterModal = new bootstrap.Modal(document.getElementById('editPrinterModal'));

    // Handle printer type selection
    document.getElementById('printerType').addEventListener('change', function() {
        const isBambuLab = this.value === 'bambulab';
        document.querySelectorAll('.bambulab-field').forEach(el => {
            el.style.display = isBambuLab ? 'block' : 'none';
            el.querySelectorAll('input').forEach(input => {
                input.required = isBambuLab;
            });
        });
        document.querySelectorAll('.octoprint-field').forEach(el => {
            el.style.display = isBambuLab ? 'none' : 'block';
        });
    });

    document.getElementById('editPrinterType').addEventListener('change', function() {
        const isBambuLab = this.value === 'bambulab';
        document.querySelectorAll('.edit-bambulab-field').forEach(el => {
            el.style.display = isBambuLab ? 'block' : 'none';
            el.querySelectorAll('input').forEach(input => {
                input.required = isBambuLab;
            });
        });
        document.querySelectorAll('.edit-octoprint-field').forEach(el => {
            el.style.display = isBambuLab ? 'none' : 'block';
        });
    });

    // Load printer list in settings
    function loadPrinterList() {
        fetch('/api/printers')
            .then(response => response.json())
            .then(printers => {
                const printerList = document.getElementById('printerList');
                printerList.innerHTML = '';
                
                Object.entries(printers).forEach(([id, printer]) => {
                    const printerElement = document.createElement('div');
                    printerElement.className = 'printer-list-item glass-card mb-2 p-3';
                    printerElement.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-1">${printer.name}</h6>
                                <small class="text-muted">${printer.type} - ${printer.ip}</small>
                            </div>
                            <button class="btn btn-sm btn-neon edit-printer" data-printer-id="${id}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    `;
                    printerList.appendChild(printerElement);
                });
            });
    }

    // Add new printer
    document.getElementById('addPrinterForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const printerData = {
            name: formData.get('name'),
            type: formData.get('type'),
            ip: formData.get('ip')
        };

        if (formData.get('type') === 'bambulab') {
            printerData.serial = formData.get('serial');
            printerData.access_code = formData.get('access_code');
        } else {
            printerData.api_key = formData.get('api_key');
        }

        fetch('/api/printers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(printerData)
        })
        .then(response => response.json())
        .then(() => {
            loadPrinterList();
            this.reset();
            window.location.reload();
        });
    });

    // Edit printer
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-printer')) {
            const printerId = e.target.closest('.edit-printer').dataset.printerId;
            fetch(`/api/printer/${printerId}`)
                .then(response => response.json())
                .then(printer => {
                    const form = document.getElementById('editPrinterForm');
                    form.querySelector('[name="printer_id"]').value = printerId;
                    form.querySelector('[name="type"]').value = printer.type;
                    form.querySelector('[name="name"]').value = printer.name;
                    form.querySelector('[name="ip"]').value = printer.ip;
                    
                    // Trigger type change event
                    const typeEvent = new Event('change');
                    form.querySelector('[name="type"]').dispatchEvent(typeEvent);

                    if (printer.type === 'bambulab') {
                        form.querySelector('[name="serial"]').value = printer.serial || '';
                        form.querySelector('[name="access_code"]').value = printer.access_code || '';
                    } else {
                        form.querySelector('[name="api_key"]').value = printer.api_key || '';
                    }
                    
                    editPrinterModal.show();
                });
        }
    });

    // Update printer
    document.getElementById('editPrinterForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const printerId = formData.get('printer_id');
        const printerData = {
            name: formData.get('name'),
            type: formData.get('type'),
            ip: formData.get('ip')
        };

        if (formData.get('type') === 'bambulab') {
            printerData.serial = formData.get('serial');
            printerData.access_code = formData.get('access_code');
        } else {
            printerData.api_key = formData.get('api_key');
        }

        fetch(`/api/printers/${printerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(printerData)
        })
        .then(() => {
            editPrinterModal.hide();
            window.location.reload();
        });
    });

    // Delete printer
    document.querySelector('.delete-printer').addEventListener('click', function() {
        const printerId = document.querySelector('#editPrinterForm [name="printer_id"]').value;
        if (confirm('Are you sure you want to delete this printer?')) {
            fetch(`/api/printers/${printerId}`, {
                method: 'DELETE'
            })
            .then(() => {
                editPrinterModal.hide();
                window.location.reload();
            });
        }
    });

    // Load printer list when settings modal is opened
    document.getElementById('settingsModal').addEventListener('show.bs.modal', loadPrinterList);

    // Refresh printer status every 5 seconds
    setInterval(async () => {
        try {
            const response = await fetch('/api/printers');
            const printers = await response.json();
            updatePrinterGrid(printers);
        } catch (error) {
            console.error('Error fetching printer status:', error);
        }
    }, 5000);
});

function updatePrinterGrid(printers) {
    Object.entries(printers).forEach(([id, printer]) => {
        const printerElement = document.querySelector(`[data-printer-id="${id}"]`);
        if (printerElement) {
            const statusHeader = printerElement.querySelector('.card-header');
            statusHeader.className = 'card-header';
            statusHeader.classList.add(
                printer.status === 'printing' ? 'status-printing' :
                printer.status === 'idle' ? 'status-idle' : 'status-offline'
            );

            const statusTitle = printerElement.querySelector('.card-title');
            statusTitle.textContent = `Status: ${printer.status}`;

            const progressBar = printerElement.querySelector('.progress');
            if (printer.status === 'printing' && printer.progress) {
                if (!progressBar) {
                    const progressHtml = `
                        <div class="progress custom-progress">
                            <div class="progress-bar progress-bar-animated" role="progressbar" style="width: ${printer.progress}%">
                                ${printer.progress}%
                            </div>
                        </div>
                    `;
                    printerElement.querySelector('.card-body').insertAdjacentHTML('beforeend', progressHtml);
                } else {
                    const progressBarInner = progressBar.querySelector('.progress-bar');
                    progressBarInner.style.width = `${printer.progress}%`;
                    progressBarInner.textContent = `${printer.progress}%`;
                }
            } else if (progressBar) {
                progressBar.remove();
            }
        }
    });
}
