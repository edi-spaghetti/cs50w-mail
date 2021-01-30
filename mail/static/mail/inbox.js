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
    document.querySelector('#email-detail-view').style.display = 'none';

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
    commit_filicide(emails_items_div);

    // Show the mailbox and hide other views
    document.querySelector('#emails-view').style.display = 'block';
    document.querySelector('#compose-view').style.display = 'none';
    document.querySelector('#email-detail-view').style.display = 'none';

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
            rows[i].onclick = function() { view_email(data, mailbox); };
        }
    })
}

function view_email(data, mailbox) {

    // Set up archiving button
	const archive_btn = document.querySelector('#toggle-archive');
	if (mailbox === 'inbox' || mailbox === 'archive') {
		archive_btn.style.display = 'block';
	} else {
		archive_btn.style.display = 'none';
	}

	archive_btn.onclick = function() { toggle_archive(this, data) };

	// ensure button is enabled, in case disabled from previous click
	archive_btn.disabled = false;
	// set the button text appropriate to current archive status
	if (data.archived) {
		archive_btn.innerHTML = 'Restore';
	} else {
		archive_btn.innerHTML = 'Archive'
	}

    // remove existing email detail, if any
    const detail_view = document.querySelector('#detail-view-item')
    commit_filicide(detail_view)

    // add a title to page to separate buttons from everything else
    var title = document.querySelector('#email-detail-title')
    title.innerHTML = 'email'

    // Show the email detail and hide other views
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'none';
    document.querySelector('#email-detail-view').style.display = 'block';

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
    var table = document.createElement('table');
    table.setAttribute('class', 'table');
    detail_view.appendChild(table);

    // add email details into body
    var body = document.createElement('tbody');
    table.appendChild(body);

    ['sender', 'recipients', 'subject', 'timestamp', 'body'].forEach(key => {

        let row = document.createElement('tr');
        body.appendChild(row);

        let data_label = document.createElement('td');
		data_label.setAttribute('class', 'detail-item-label');
        data_label.innerHTML = escape_html(key);
        row.appendChild(data_label);

        let data_cell = document.createElement('td');
		data_cell.setAttribute('class', 'detail-item-value')

        // handle data by type
        if (data[key].constructor === Array) {

			// create a flex container for list items
			let list_container = document.createElement('div');
			list_container.setAttribute('class', 'd-flex flex-row');
			data_cell.appendChild(list_container);

            data[key].forEach(value => {

                // create an inner div for each item in the list
                let inner_item = document.createElement('div');
                inner_item.setAttribute('class', 'detail-list-value');
                inner_item.innerHTML = escape_html(value);
                // add it to the container
                list_container.appendChild(inner_item);
            })
        } else {
            data_cell.innerHTML = escape_html(data[key]);
        }

        row.appendChild(data_cell);
    })

}


function toggle_archive(btn, data) {

	// disable the button to prevent repeat clicks if api responds slowly
	btn.disabled = true;

	fetch(`/emails/${data.id}`, {
		method: 'PUT',
		body: JSON.stringify({
			archived: !data.archived
		})
	})
    .then(response => { if (!(response.status === 204)) {
	    // email put requests don't return a body message so just log
	    // if something goes wrong (i.e. not a 204 status)
	    console.log(response)
	} else {
		load_mailbox('inbox');
	}});
}

// removes all children of provided element
function commit_filicide(element) {

    if (!(element === null)) {
        while (element.lastElementChild) {
            element.removeChild(
                element.lastElementChild
            );
        }
    } else {
        console.log('attempted filicide on null')
    }
}

// escapes unsafe html characters in email subject and body so they are
// displayed as plain text instead of evaluated as html. From SO:
// https://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript
function escape_html(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
