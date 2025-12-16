/**
 * Price Alert Email Templates
 * Various email templates for price alert notifications
 */

/**
 * Price Alert Creation Template
 * Sent when user creates a new price alert
 */
export const priceAlertEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Price Alert Created</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .logo { max-width: 150px; height: auto; }
        .content { background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .alert-info { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; }
        .price-highlight { font-size: 24px; font-weight: bold; color: #4caf50; margin: 10px 0; }
        .route-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #2196f3; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .button:hover { background: #1976d2; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .summary { background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ff9800; }
    </style>
</head>
<body>
    <div class="header">
        <img src="{{branding.logoImageUrl}}" alt="Golobe Travel Agency" class="logo">
    </div>
    
    <div class="content">
        <h2>Price Alert Created Successfully! 🎯</h2>
        
        <p>We've set up your price alert and will notify you when prices drop for your desired route.</p>
        
        <div class="summary">
            <h3>Alert Summary:</h3>
            <p><strong>{{main.alertSummary}}</strong></p>
        </div>
        
        <div class="route-info">
            <h4>Route Details:</h4>
            <p><strong>From:</strong> {{main.flightDetails.route.origin.airportCode}} ({{main.flightDetails.route.origin.city}})</p>
            <p><strong>To:</strong> {{main.flightDetails.route.destination.airportCode}} ({{main.flightDetails.route.destination.city}})</p>
            <p><strong>Departure:</strong> {{main.flightDetails.departureDate}}</p>
            <p><strong>Passengers:</strong> {{main.flightDetails.passengers.adults}} Adult{{#if main.flightDetails.passengers.children > 0}}, {{main.flightDetails.passengers.children}} Child{{#if main.flightDetails.passengers.children > 1}}ren{{/if}}{{/if}}</p>
            <p><strong>Class:</strong> {{main.flightDetails.cabinClass}}</p>
        </div>
        
        {{#if main.currentPrice}}
        <div class="alert-info">
            <h3>Current Best Price:</h3>
            <div class="price-highlight">{{main.currentPrice}}</div>
            <p>We'll monitor prices and alert you when they drop according to your conditions.</p>
        </div>
        {{/if}}
        
        <div style="text-align: center;">
            <a href="{{main.manageAlertsUrl}}" class="button">Manage Your Alerts</a>
        </div>
        
        <p>You can manage or modify your alerts at any time from your dashboard.</p>
    </div>
    
    <div class="footer">
        <p>This alert was created on {{main.createdAt}}. You can <a href="{{main.unsubscribeUrl}}">unsubscribe</a> at any time.</p>
        <p>&copy; {{branding.currentYear}} Golobe Travel Agency. All rights reserved.</p>
    </div>
</body>
</html>
`;

/**
 * Price Drop Alert Template
 * Sent when price drops and alert is triggered
 */
export const priceDropEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Price Drop Alert! 📉</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .logo { max-width: 150px; height: auto; }
        .content { background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .price-drop { background: #e8f5e8; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50; text-align: center; }
        .old-price { text-decoration: line-through; color: #666; font-size: 18px; }
        .new-price { font-size: 28px; font-weight: bold; color: #4caf50; margin: 10px 0; }
        .savings { font-size: 20px; color: #2196f3; font-weight: bold; }
        .route-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #4caf50; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .button:hover { background: #45a049; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .urgent { background: #ffebee; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f44336; }
        .price-comparison { display: flex; justify-content: space-between; align-items: center; margin: 20px 0; }
        .price-box { text-align: center; padding: 15px; border-radius: 8px; flex: 1; margin: 0 10px; }
        .price-box:first-child { margin-left: 0; }
        .price-box:last-child { margin-right: 0; }
        .previous { background: #fff3e0; border: 1px solid #ffcc02; }
        .current { background: #e8f5e8; border: 1px solid #4caf50; }
    </style>
</head>
<body>
    <div class="header">
        <img src="{{branding.logoImageUrl}}" alt="Golobe Travel Agency" class="logo">
    </div>
    
    <div class="content">
        <h2>🎉 Price Drop Alert! 📉</h2>
        
        <p>Great news! We've detected a significant price drop for your monitored route.</p>
        
        <div class="price-drop">
            <h3>Price Drop Detected!</h3>
            <div class="price-comparison">
                <div class="price-box previous">
                    <div>Previous Price</div>
                    <div class="old-price">{{main.previousPrice}}</div>
                </div>
                <div class="price-box current">
                    <div>Current Price</div>
                    <div class="new-price">{{main.currentPrice}}</div>
                </div>
            </div>
            <div class="savings">You Save: {{main.priceChange.amount}} ({{main.priceChange.percentage}}%)</div>
        </div>
        
        <div class="route-info">
            <h4>Flight Details:</h4>
            <p><strong>Route:</strong> {{main.flightDetails.route.origin.airportCode}} → {{main.flightDetails.route.destination.airportCode}}</p>
            <p><strong>Departure:</strong> {{main.flightDetails.departureDate}}</p>
            <p><strong>Airline:</strong> {{main.flightDetails.airlineCode}}</p>
            <p><strong>Flight:</strong> {{main.flightDetails.flightCode}}</p>
        </div>
        
        {{#if main.priceChange.percentage > 20}}
        <div class="urgent">
            <strong>🔥 Hot Deal Alert!</strong> This is a significant price drop of {{main.priceChange.percentage}}%. Book quickly before prices go back up!
        </div>
        {{/if}}
        
        <div style="text-align: center;">
            <a href="{{main.manageAlertsUrl}}" class="button">View Flight Details</a>
        </div>
        
        <p><strong>Why book now?</strong></p>
        <ul>
            <li>Prices can change frequently and may go back up</li>
            <li>Limited seats available at this price</li>
            <li>This deal meets your alert conditions perfectly</li>
        </ul>
    </div>
    
    <div class="footer">
        <p>This alert was triggered on {{main.triggeredAt}}. You can <a href="{{main.unsubscribeUrl}}">unsubscribe</a> from this specific alert.</p>
        <p>&copy; {{branding.currentYear}} Golobe Travel Agency. All rights reserved.</p>
    </div>
</body>
</html>
`;

/**
 * Daily Digest Template
 * Sent as daily summary of price alerts
 */
export const dailyDigestEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Price Alert Digest</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .logo { max-width: 150px; height: auto; }
        .content { background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .digest-summary { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; }
        .alert-item { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #ff9800; }
        .alert-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .status-active { background: #e8f5e8; color: #2e7d32; }
        .status-triggered { background: #fff3e0; color: #f57c00; }
        .status-expired { background: #ffebee; color: #c62828; }
        .price { font-weight: bold; color: #4caf50; }
        .button { display: inline-block; padding: 12px 24px; background: #2196f3; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .button:hover { background: #1976d2; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat-item { text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; color: #2196f3; }
        .stat-label { font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <img src="{{branding.logoImageUrl}}" alt="Golobe Travel Agency" class="logo">
    </div>
    
    <div class="content">
        <h2>Daily Price Alert Digest 📊</h2>
        <p>Here's your daily summary of price alerts and market movements.</p>
        
        <div class="digest-summary">
            <h3>Today's Overview</h3>
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-number">{{main.digestSummary.totalAlerts}}</div>
                    <div class="stat-label">Total Alerts</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{{main.digestSummary.activeAlerts}}</div>
                    <div class="stat-label">Active</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{{main.digestSummary.triggeredAlerts}}</div>
                    <div class="stat-label">Triggered</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">{{main.digestSummary.routes}}</div>
                    <div class="stat-label">Routes</div>
                </div>
            </div>
        </div>
        
        <h3>Your Price Alerts</h3>
        
        {{#each main.alertDetails}}
        <div class="alert-item">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4>{{this.summary}}</h4>
                    <p><strong>Status:</strong> <span class="alert-status status-{{this.status}}">{{this.status}}</span></p>
                    {{#if this.currentPrice}}
                    <p><strong>Current Price:</strong> <span class="price">{{this.currentPrice}}</span></p>
                    {{/if}}
                    {{#if this.lastTriggered}}
                    <p><strong>Last Triggered:</strong> {{this.lastTriggered}}</p>
                    {{/if}}
                </div>
            </div>
        </div>
        {{/each}}
        
        <div style="text-align: center;">
            <a href="{{main.manageAlertsUrl}}" class="button">Manage All Alerts</a>
        </div>
        
        <p>You can adjust your alert conditions or notification preferences at any time.</p>
    </div>
    
    <div class="footer">
        <p>This digest was sent on {{currentDate}}. You can <a href="{{main.unsubscribeUrl}}">unsubscribe</a> from daily digests.</p>
        <p>&copy; {{branding.currentYear}} Golobe Travel Agency. All rights reserved.</p>
    </div>
</body>
</html>
`;

/**
 * Alert Expiring Template
 * Sent when price alert is about to expire
 */
export const alertExpiringEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Price Alert Expiring Soon</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .logo { max-width: 150px; height: auto; }
        .content { background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .warning { background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800; }
        .time-remaining { font-size: 24px; font-weight: bold; color: #f57c00; text-align: center; margin: 15px 0; }
        .route-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #ff9800; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        .button:hover { background: #e68900; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <img src="{{branding.logoImageUrl}}" alt="Golobe Travel Agency" class="logo">
    </div>
    
    <div class="content">
        <h2>⏰ Price Alert Expiring Soon</h2>
        
        <div class="warning">
            <h3>Your Price Alert is Expiring</h3>
            <div class="time-remaining">{{main.timeRemaining}}</div>
            <p>After this date, we'll stop monitoring prices for this alert.</p>
        </div>
        
        <div class="route-info">
            <h4>Alert Details:</h4>
            <p><strong>Route:</strong> {{main.alertSummary}}</p>
            <p><strong>Expires:</strong> {{main.expiresAt}}</p>
            {{#if main.currentPrice}}
            <p><strong>Current Best Price:</strong> {{main.currentPrice}}</p>
            {{/if}}
        </div>
        
        <div style="text-align: center;">
            <a href="{{main.extendAlertUrl}}" class="button">Extend Alert</a>
        </div>
        
        <p>Don't miss out on potential price drops! Extend your alert to continue monitoring.</p>
    </div>
    
    <div class="footer">
        <p>This notification was sent on {{currentDate}}. You can <a href="{{main.unsubscribeUrl}}">unsubscribe</a> at any time.</p>
        <p>&copy; {{branding.currentYear}} Golobe Travel Agency. All rights reserved.</p>
    </div>
</body>
</html>
`;