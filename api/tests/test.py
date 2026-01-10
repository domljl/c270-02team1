​​​​​​​<form action="/submit" method="POST">
  Module:
  <input name="module" type="text" required />
<br/><br/>
  Grade:
  <input name="grade" type="select" required/>
<br/><br/>
    <select name="grade">
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
    <input type="submit" value="Add"/>
</form>





<body>
    <ul>
        <% for(let i = 0; i < fruit.length ; i++) {%>
            <li>
                <%= fruit[i] %>
            </li>
        <%} %>
    </ul>
<body>
                                            