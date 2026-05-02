# Notification System Design

## Overview
This is a real-time notification dashboard built using React.

## Features
- Fetch notifications from API
- Poll every 10 seconds
- Group by type (email, sms, push)
- Show latest 10 per type
- Highlight new notifications

## Data Handling
- Uses in-memory state
- No database used

## Performance
- Efficient updates using polling
- Limits data size