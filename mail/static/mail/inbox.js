document.addEventListener('DOMContentLoaded', function() {

    // Use buttons to toggle between views
    document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
    document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
    document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
    document.querySelector('#compose').addEventListener('click', compose_email);

    // By default, load the inbox
    load_mailbox('inbox');

    // Add an event handler for form submission
    const compose_form = document.querySelector('#compose-form')
    compose_form.onsubmit = send_email;
});

function compose_email() {

    // Show compose view and hide other views
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'block';

    // Clear out composition fields
    document.querySelector('#compose-recipients').value = '';
    document.querySelector('#compose-subject').value = '';
    document.querySelector('#compose-body').value = '';
}

function send_email() {

    console.log('Sending email!');

    const sender = document.querySelector('#compose-sender').value;
    const recipients = document.querySelector('#compose-recipients').value;
    const subject = document.querySelector('#compose-subject').value;
    const body = document.querySelector('#compose-body').value;

    console.log(`sender: ${sender}`);
    console.log(`recipients: ${recipients}`);
    console.log(`subject: ${subject}`);
    console.log(`body: ${body}`);

    fetch('/emails', {
        method: 'POST',
        body: JSON.stringify({
            recipients: recipients,
            subject: subject,
            body: body
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.error) {

            console.log(`got errors: ${result.error}`);

            // change border colour
            recipients_div = document.querySelector('#compose-recipients');
            recipients_div.setAttribute('data-invalid', 'true');
            recipients_div.parentNode.setAttribute('data-invalid', 'true');

            // pop-up warning
            let warning = document.querySelector('#compose-recipients ~ span');
            if (warning === null) {
                warning = document.createElement('span');
            }
            warning.setAttribute('class', 'error_message');
            warning.innerHTML = result.error;

            // insert warning after input box
            recipients_div.parentNode.insertBefore(
                warning, recipients_div.nextSibling
            );
        }
        else if (result.message) {
            console.log(`success: ${result.message}`);
            load_mailbox('sent');
        }
        else {
            console.log('Unexpected result:');
            console.log(result);
        }
    });

    return false;
}

function load_mailbox(mailbox) {

        const emails_items_div = document.querySelector('#emails-view-items');
        // clear out the container if there are emails there previously
        if (emails_items_div.childElementCount) {
            while (emails_items_div.lastElementChild) {
                emails_items_div.removeChild(
                    emails_items_div.lastElementChild
                );
            }
        }

    // Show the mailbox and hide other views
    document.querySelector('#emails-view').style.display = 'block';
    document.querySelector('#compose-view').style.display = 'none';

    // Show the mailbox name
    const title = document.querySelector('#emails-view-title')
    title.innerHTML = mailbox;

    // Get the mailbox contents
    fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(result => {

        // create a table element
        var table = document.createElement('table');
        table.setAttribute('class', 'table');
        emails_items_div.appendChild(table);

        // add headers
        var header = document.createElement('thead');
        table.appendChild(header);

        var header_row = document.createElement('tr');
        header.appendChild(header_row);

        ['From', 'Subject', 'Time'].forEach(heading => {
            var header_cell = document.createElement('th');
            header_cell.setAttribute('scope', 'col');
            header_cell.innerHTML = heading;
            header_row.appendChild(header_cell);
        });

        // add cells
        var item_body = document.createElement('tbody');
        item_body.setAttribute('id', 'emails-item-list')
        table.appendChild(item_body);

        for (var i = 0; i < result.length; i++) {
            var data = result[i];

            var item_row = document.createElement('tr');
            item_row.setAttribute('data-read', `${data.read}`);
            item_row.setAttribute('id', `email-item-${i}`)
            item_body.appendChild(item_row);

            ['sender', 'subject', 'timestamp'].forEach(key => {
                var data_cell = document.createElement('td');
                data_cell.innerHTML = data[key];
                item_row.appendChild(data_cell);
            });
        }

        var rows =  document.querySelectorAll('tr[data-read]')
        for (var i = 0; i < rows.length; i++) {
            // note to self: use let to avoid variable hoisting
            let data = result[i];
            rows[i].onclick = function() { view_email(data); };
        }
    })
}

function view_email(data) {

    // mark the email as read if not already
    if (!data.read) {
        fetch(`/emails/${data.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                read: true
            })
        })
        .then(response => { if (!(response.status === 204)) {
            // email put requests don't return a body message so just log
            // if something goes wrong (i.e. not a 204 status)
            console.log(response)
        }});
    }

    // load the email detail page
    console.log('load detail page')
    // TODO
}
